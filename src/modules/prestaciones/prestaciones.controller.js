const { pool } = require('../../config/database');

const PRIMA_PCT = 1 / 12;
const CESANTIAS_PCT = 1 / 12;
const INTERESES_CESANTIAS_PCT = 0.12;
const VACACIONES_PCT = 1 / 24;

const getPrestacionesResumen = async (req, res) => {
  try {
    const { id_empleado, anio } = req.query;
    const year = Number(anio) || new Date().getFullYear();
    const isAdminOrRRHH = req.user?.rol === 'ADMINISTRADOR' || req.user?.rol === 'RRHH';
    const isEmployee = req.user?.rol === 'EMPLEADO';

    if (!isAdminOrRRHH && !isEmployee) {
      return res.status(403).json({ success: false, message: 'Sin permisos' });
    }

    let whereClause = 'WHERE pd.anio = ?';
    const params = [year];

    if (isEmployee && req.user?.id_empleado) {
      whereClause += ' AND pd.id_empleado = ?';
      params.push(req.user.id_empleado);
    } else if (id_empleado) {
      whereClause += ' AND pd.id_empleado = ?';
      params.push(Number(id_empleado));
    }

    const [rows] = await pool.query(
      `SELECT
        pd.id_prestacion,
        pd.id_empleado,
        CONCAT(e.nombres, ' ', e.apellidos) AS empleado,
        e.sueldo AS salario_actual,
        pd.anio,
        pd.mes,
        pd.salario_base,
        pd.dias_acumulados,
        pd.prima_servicios,
        pd.cesantias,
        pd.intereses_cesantias,
        pd.vacaciones
      FROM prestaciones_devengadas pd
      INNER JOIN empleados e ON e.id_empleado = pd.id_empleado
      ${whereClause}
      ORDER BY pd.id_empleado, pd.mes ASC`,
      params
    );

    const acumulado = rows.reduce((acc, row) => {
      const key = row.id_empleado;
      if (!acc[key]) {
        acc[key] = {
          id_empleado: row.id_empleado,
          empleado: row.empleado,
          salario_actual: row.salario_actual,
          meses: [],
          totales: { prima: 0, cesantias: 0, intereses: 0, vacaciones: 0 }
        };
      }
      acc[key].meses.push(row);
      acc[key].totales.prima += Number(row.prima_servicios);
      acc[key].totales.cesantias += Number(row.cesantias);
      acc[key].totales.intereses += Number(row.intereses_cesantias);
      acc[key].totales.vacaciones += Number(row.vacaciones);
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        anio: year,
        empleados: Object.values(acumulado),
        filas: rows
      }
    });
  } catch (error) {
    console.error('Error obteniendo prestaciones:', error.message);
    return res.status(500).json({ success: false, message: 'Error obteniendo prestaciones sociales' });
  }
};

const calcularPrestacionesEmpleado = async (idEmpleado, anio, mes, salarioBase, connection) => {
  const diasEnMes = new Date(anio, mes, 0).getDate();
  const db = connection || pool;

  const [existingRows] = await db.query(
    `SELECT id_prestacion, dias_acumulados FROM prestaciones_devengadas
     WHERE id_empleado = ? AND anio = ? AND mes = ?`,
    [idEmpleado, anio, mes]
  );

  const [prevRows] = await db.query(
    `SELECT COALESCE(SUM(dias_acumulados), 0) AS dias_previos
     FROM prestaciones_devengadas
     WHERE id_empleado = ? AND (anio < ? OR (anio = ? AND mes < ?))`,
    [idEmpleado, anio, anio, mes]
  );
  const diasPrevios = Number(prevRows[0]?.dias_previos) || 0;
  const diasAcumulados = diasPrevios + diasEnMes;

  const prima = Number(((salarioBase * diasEnMes) * PRIMA_PCT / 30).toFixed(2));
  const cesantias = Number(((salarioBase * diasEnMes) * CESANTIAS_PCT / 30).toFixed(2));
  const intereses = Number((cesantias * INTERESES_CESANTIAS_PCT * (diasEnMes / 360)).toFixed(2));
  const vacaciones = Number(((salarioBase * diasEnMes) * VACACIONES_PCT / 15).toFixed(2));

  if (existingRows.length > 0) {
    await db.query(
      `UPDATE prestaciones_devengadas
       SET salario_base = ?, dias_acumulados = ?, prima_servicios = ?,
           cesantias = ?, intereses_cesantias = ?, vacaciones = ?
       WHERE id_prestacion = ?`,
      [salarioBase, diasAcumulados, prima, cesantias, intereses, vacaciones, existingRows[0].id_prestacion]
    );
  } else {
    await db.query(
      `INSERT INTO prestaciones_devengadas (id_empleado, anio, mes, salario_base, dias_acumulados, prima_servicios, cesantias, intereses_cesantias, vacaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idEmpleado, anio, mes, salarioBase, diasAcumulados, prima, cesantias, intereses, vacaciones]
    );
  }
};

const acumularPrestaciones = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_empleado, anio, mes } = req.body;
    const year = Number(anio) || new Date().getFullYear();
    const month = Number(mes) || (new Date().getMonth() + 1);

    if (!id_empleado) {
      return res.status(400).json({ success: false, message: 'id_empleado es obligatorio' });
    }

    const [empRows] = await connection.query(
      `SELECT id_empleado, sueldo FROM empleados WHERE id_empleado = ? LIMIT 1`,
      [id_empleado]
    );
    if (empRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
    }

    const salarioBase = Number(empRows[0].sueldo) || 0;
    await calcularPrestacionesEmpleado(id_empleado, year, month, salarioBase, connection);

    return res.json({
      success: true,
      message: `Prestaciones acumuladas para empleado ${id_empleado} - ${year}/${month}`
    });
  } catch (error) {
    console.error('Error acumulando prestaciones:', error.message);
    return res.status(500).json({ success: false, message: 'Error acumulando prestaciones' });
  } finally {
    connection.release();
  }
};

const acumularPrestacionesMasivo = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { anio, mes } = req.body;
    const year = Number(anio) || new Date().getFullYear();
    const month = Number(mes) || (new Date().getMonth() + 1);

    const [empRows] = await connection.query(
      `SELECT id_empleado, sueldo FROM empleados WHERE activo = 1`
    );
    if (empRows.length === 0) {
      return res.status(404).json({ success: false, message: 'No hay empleados activos' });
    }

    for (const emp of empRows) {
      const salarioBase = Number(emp.sueldo) || 0;
      await calcularPrestacionesEmpleado(emp.id_empleado, year, month, salarioBase, connection);
    }

    return res.json({
      success: true,
      message: `Prestaciones acumuladas para ${empRows.length} empleados - ${year}/${month}`
    });
  } catch (error) {
    console.error('Error acumulando prestaciones masivo:', error.message);
    return res.status(500).json({ success: false, message: 'Error acumulando prestaciones masivo' });
  } finally {
    connection.release();
  }
};

module.exports = {
  getPrestacionesResumen,
  acumularPrestaciones,
  acumularPrestacionesMasivo,
  calcularPrestacionesEmpleado
};
