const logger = require('../../utils/logger');
const { pool } = require('../../config/database');
const { generateLiquidacionPdfBuffer } = require('./liquidacion-pdf.service');

const PRIMA_PCT = 1 / 12;
const CESANTIAS_PCT = 1 / 12;
const INTERESES_CESANTIAS_PCT = 0.12;
const VACACIONES_PCT = 1 / 24;

const calcularLiquidacion = async (req, res) => {
  try {
    const { id_empleado, fecha_retiro, motivo_retiro } = req.body;

    if (!id_empleado || !fecha_retiro) {
      return res.status(400).json({
        success: false,
        message: 'id_empleado y fecha_retiro son obligatorios'
      });
    }

    const [empRows] = await pool.query(
      `SELECT id_empleado, nombres, apellidos, sueldo, fecha_ingreso
       FROM empleados WHERE id_empleado = ? LIMIT 1`,
      [id_empleado]
    );

    if (empRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
    }

    const emp = empRows[0];
    const salarioBase = Number(emp.sueldo) || 0;
    const fechaIngreso = new Date(emp.fecha_ingreso);
    const fechaRetiro = new Date(fecha_retiro);
    const anioRetiro = fechaRetiro.getFullYear();

    const inicioAnio = new Date(anioRetiro, 0, 1);
    const fechaInicioCalculo = fechaIngreso > inicioAnio ? fechaIngreso : inicioAnio;
    const diasTrabajadosAnio = Math.max(0, Math.floor((fechaRetiro - fechaInicioCalculo) / (1000 * 60 * 60 * 24)));

    const [prestacionesRows] = await pool.query(
      `SELECT
        COALESCE(SUM(prima_servicios), 0) AS prima_acumulada,
        COALESCE(SUM(cesantias), 0) AS cesantias_acumuladas,
        COALESCE(SUM(intereses_cesantias), 0) AS intereses_acumulados,
        COALESCE(SUM(vacaciones), 0) AS vacaciones_acumuladas
      FROM prestaciones_devengadas
      WHERE id_empleado = ? AND anio = ?`,
      [id_empleado, anioRetiro]
    );
    const prefs = prestacionesRows[0];

    const prima = Number((salarioBase * diasTrabajadosAnio * PRIMA_PCT / 30).toFixed(2));
    const cesantias = Number((salarioBase * diasTrabajadosAnio * CESANTIAS_PCT / 30).toFixed(2));
    const interesesCesantias = Number((cesantias * INTERESES_CESANTIAS_PCT * (diasTrabajadosAnio / 360)).toFixed(2));
    const vacacionesNoDisfrutadas = Number(((salarioBase / 360) * diasTrabajadosAnio * 15 / 360).toFixed(2));

    const detalle = [
      { concepto: 'Prima de servicios', tipo: 'DEVENGADO', valor: prima },
      { concepto: 'Cesantías', tipo: 'DEVENGADO', valor: cesantias },
      { concepto: 'Intereses sobre cesantías', tipo: 'DEVENGADO', valor: interesesCesantias },
      { concepto: 'Vacaciones no disfrutadas', tipo: 'DEVENGADO', valor: vacacionesNoDisfrutadas }
    ];

    // 1. Obtener la última fecha de corte pagada (si existe registro se asume pagado)
    const [lastNominaRows] = await pool.query(
      `SELECT MAX(fecha_corte) AS ultima_fecha FROM nomina WHERE id_empleado = ?`,
      [id_empleado]
    );
    
    let fechaInicioSueldo = new Date(emp.fecha_ingreso);
    if (lastNominaRows[0]?.ultima_fecha) {
      fechaInicioSueldo = new Date(lastNominaRows[0].ultima_fecha);
      fechaInicioSueldo.setUTCDate(fechaInicioSueldo.getUTCDate() + 1);
    }

    // 2. Calcular días pendientes usando regla de 30 días por mes
    const y1 = fechaInicioSueldo.getUTCFullYear();
    const m1 = fechaInicioSueldo.getUTCMonth() + 1;
    const d1 = Math.min(30, fechaInicioSueldo.getUTCDate());

    const y2 = fechaRetiro.getUTCFullYear();
    const m2 = fechaRetiro.getUTCMonth() + 1;
    const d2 = Math.min(30, fechaRetiro.getUTCDate());

    const diasPendientes = Math.max(0, (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1 + 1));

    if (diasPendientes > 0) {
      const sueldoBruto = Number(((salarioBase / 30) * diasPendientes).toFixed(2));
      const salud = Number((sueldoBruto * 0.04).toFixed(2));
      const pension = Number((sueldoBruto * 0.04).toFixed(2));

      detalle.push({ 
        concepto: `Sueldo pendiente (${diasPendientes} días desde último pago)`, 
        tipo: 'DEVENGADO', 
        valor: sueldoBruto 
      });
      detalle.push({ concepto: 'Deducción Salud (4%)', tipo: 'DEDUCCION', valor: salud });
      detalle.push({ concepto: 'Deducción Pensión (4%)', tipo: 'DEDUCCION', valor: pension });
    }

    const totalLiquidacion = detalle.reduce((sum, d) => sum + (d.tipo === 'DEVENGADO' ? d.valor : -d.valor), 0);

    return res.json({
      success: true,
      data: {
        id_empleado,
        empleado: `${emp.nombres} ${emp.apellidos}`,
        salario_base: salarioBase,
        fecha_ingreso: emp.fecha_ingreso,
        fecha_retiro,
        motivo_retiro: motivo_retiro || '',
        dias_trabajados_anio: diasTrabajadosAnio,
        detalle,
        total_liquidacion: Number(totalLiquidacion.toFixed(2))
      }
    });
  } catch (error) {
    logger.error('Error calculando liquidacion:', error.message);
    return res.status(500).json({ success: false, message: 'Error calculando liquidacion' });
  }
};

const guardarLiquidacion = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_empleado, fecha_retiro, motivo_retiro, detalle } = req.body;

    if (!id_empleado || !fecha_retiro) {
      return res.status(400).json({ success: false, message: 'id_empleado y fecha_retiro obligatorios' });
    }

    const [empRows] = await connection.query(
      `SELECT id_empleado, sueldo, fecha_ingreso FROM empleados WHERE id_empleado = ? LIMIT 1`,
      [id_empleado]
    );
    if (empRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
    }

    const emp = empRows[0];
    const salarioBase = Number(emp.sueldo) || 0;
    const fechaIngreso = new Date(emp.fecha_ingreso);
    const fechaRetiro = new Date(fecha_retiro);
    const anioRetiro = fechaRetiro.getFullYear();
    const inicioAnio = new Date(anioRetiro, 0, 1);
    const fechaInicioCalculo = fechaIngreso > inicioAnio ? fechaIngreso : inicioAnio;
    const diasTrabajadosAnio = Math.max(0, Math.floor((fechaRetiro - fechaInicioCalculo) / (1000 * 60 * 60 * 24)));

    const detalleLiquidacion = Array.isArray(detalle) && detalle.length > 0 ? detalle : [];

    const primaItem = detalleLiquidacion.find(d => d.concepto?.toLowerCase().includes('prima'));
    const cesantiasItem = detalleLiquidacion.find(d => d.concepto?.toLowerCase().includes('cesantía') && !d.concepto?.toLowerCase().includes('interés'));
    const interesesItem = detalleLiquidacion.find(d => d.concepto?.toLowerCase().includes('intereses'));
    const vacacionesItem = detalleLiquidacion.find(d => d.concepto?.toLowerCase().includes('vacaciones'));

    await connection.beginTransaction();

    const [liquidacionResult] = await connection.query(
      `INSERT INTO liquidaciones
        (id_empleado, fecha_retiro, motivo_retiro, salario_base, dias_trabajados_anio,
         prima_servicios, cesantias, intereses_cesantias, vacaciones_no_disfrutadas,
         indemnizacion, total_liquidacion, estado, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?)`,
      [
        id_empleado, fecha_retiro, motivo_retiro || '', salarioBase, diasTrabajadosAnio,
        primaItem?.valor || 0, cesantiasItem?.valor || 0, interesesItem?.valor || 0,
        vacacionesItem?.valor || 0, 0, 0, req.user?.id_usuario || null
      ]
    );

    const idLiquidacion = liquidacionResult.insertId;

    if (detalleLiquidacion.length > 0) {
      const detalleRows = detalleLiquidacion.map(d => [
        idLiquidacion, d.concepto, d.tipo || 'DEVENGADO', Number(d.valor) || 0
      ]);
      await connection.query(
        `INSERT INTO detalle_liquidacion (id_liquidacion, concepto, tipo, valor) VALUES ?`,
        [detalleRows]
      );
    }

    const totalLiquidacion = detalleLiquidacion.reduce(
      (sum, d) => sum + ((d.tipo === 'DEDUCCION' ? -1 : 1) * (Number(d.valor) || 0)), 0
    );

    await connection.query(
      `UPDATE liquidaciones SET total_liquidacion = ? WHERE id_liquidacion = ?`,
      [Number(totalLiquidacion.toFixed(2)), idLiquidacion]
    );

    await connection.query(
      `UPDATE empleados SET activo = 0, fecha_retiro = ?, eliminado_en = NOW() WHERE id_empleado = ?`,
      [fecha_retiro, id_empleado]
    );

    await connection.commit();

    const [savedRows] = await connection.query(
      `SELECT id_liquidacion, id_empleado, fecha_retiro, motivo_retiro, total_liquidacion, estado
       FROM liquidaciones WHERE id_liquidacion = ?`,
      [idLiquidacion]
    );

    return res.status(201).json({
      success: true,
      message: 'Liquidacion guardada y empleado desactivado exitosamente',
      data: savedRows[0]
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Error guardando liquidacion:', error.message);
    return res.status(500).json({ success: false, message: 'Error guardando liquidacion' });
  } finally {
    connection.release();
  }
};

const getLiquidaciones = async (req, res) => {
  try {
    const { id_empleado, estado } = req.query;
    const isAdminOrRRHH = req.user?.rol === 'ADMINISTRADOR' || req.user?.rol === 'RRHH';
    const isEmployee = req.user?.rol === 'EMPLEADO';

    if (!isAdminOrRRHH && !isEmployee) {
      return res.status(403).json({ success: false, message: 'Sin permisos' });
    }

    const whereClauses = [];
    const params = [];

    if (isEmployee && req.user?.id_empleado) {
      whereClauses.push('l.id_empleado = ?');
      params.push(req.user.id_empleado);
    } else if (id_empleado) {
      whereClauses.push('l.id_empleado = ?');
      params.push(Number(id_empleado));
    }

    if (estado) {
      whereClauses.push('l.estado = ?');
      params.push(estado);
    }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const [rows] = await pool.query(
      `SELECT
        l.id_liquidacion, l.id_empleado, l.fecha_retiro, l.motivo_retiro,
        l.salario_base, l.dias_trabajados_anio, l.prima_servicios, l.cesantias,
        l.intereses_cesantias, l.vacaciones_no_disfrutadas, l.indemnizacion,
        l.total_liquidacion, l.estado, l.creado_en,
        CONCAT(e.nombres, ' ', e.apellidos) AS empleado,
        e.numero_identificacion
      FROM liquidaciones l
      INNER JOIN empleados e ON e.id_empleado = l.id_empleado
      ${whereSQL}
      ORDER BY l.creado_en DESC`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error obteniendo liquidaciones:', error.message);
    return res.status(500).json({ success: false, message: 'Error obteniendo liquidaciones' });
  }
};

const getLiquidacionById = async (req, res) => {
  try {
    const { id_liquidacion } = req.params;

    const [liqRows] = await pool.query(
      `SELECT
        l.*, CONCAT(e.nombres, ' ', e.apellidos) AS empleado,
        e.numero_identificacion, e.tipo_identificacion, e.fecha_ingreso,
        c.nombre_cargo, d.nombre_departamento
      FROM liquidaciones l
      INNER JOIN empleados e ON e.id_empleado = l.id_empleado
      LEFT JOIN cargos c ON c.id_cargo = e.id_cargo
      LEFT JOIN departamentos d ON d.id_departamento = e.id_departamento
      WHERE l.id_liquidacion = ?`,
      [id_liquidacion]
    );

    if (liqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Liquidacion no encontrada' });
    }

    const [detalleRows] = await pool.query(
      `SELECT id_detalle, concepto, tipo, valor
       FROM detalle_liquidacion WHERE id_liquidacion = ?`,
      [id_liquidacion]
    );

    return res.json({
      success: true,
      data: {
        liquidacion: liqRows[0],
        detalle: detalleRows
      }
    });
  } catch (error) {
    logger.error('Error obteniendo liquidacion:', error.message);
    return res.status(500).json({ success: false, message: 'Error obteniendo liquidacion' });
  }
};

const anularLiquidacion = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_liquidacion } = req.params;

    const [liqRows] = await connection.query(
      `SELECT id_liquidacion, id_empleado, estado FROM liquidaciones WHERE id_liquidacion = ?`,
      [id_liquidacion]
    );

    if (liqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Liquidacion no encontrada' });
    }

    if (liqRows[0].estado === 'ANULADA') {
      return res.status(400).json({ success: false, message: 'La liquidacion ya esta anulada' });
    }

    await connection.beginTransaction();

    await connection.query(
      `UPDATE liquidaciones SET estado = 'ANULADA' WHERE id_liquidacion = ?`,
      [id_liquidacion]
    );

    await connection.query(
      `UPDATE empleados SET activo = 1, fecha_retiro = NULL, eliminado_en = NULL WHERE id_empleado = ?`,
      [liqRows[0].id_empleado]
    );

    await connection.commit();

    return res.json({ success: true, message: 'Liquidacion anulada y empleado reactivado' });
  } catch (error) {
    await connection.rollback();
    logger.error('Error anulando liquidacion:', error.message);
    return res.status(500).json({ success: false, message: 'Error anulando liquidacion' });
  } finally {
    connection.release();
  }
};

const marcarPagada = async (req, res) => {
  try {
    const { id_liquidacion } = req.params;

    const [liqRows] = await pool.query(
      `SELECT id_liquidacion, estado FROM liquidaciones WHERE id_liquidacion = ?`,
      [id_liquidacion]
    );

    if (liqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Liquidacion no encontrada' });
    }

    if (liqRows[0].estado === 'ANULADA') {
      return res.status(400).json({ success: false, message: 'No se puede pagar una liquidacion anulada' });
    }

    await pool.query(
      `UPDATE liquidaciones SET estado = 'PAGADA' WHERE id_liquidacion = ?`,
      [id_liquidacion]
    );

    return res.json({ success: true, message: 'Liquidacion marcada como pagada' });
  } catch (error) {
    logger.error('Error actualizando liquidacion:', error.message);
    return res.status(500).json({ success: false, message: 'Error actualizando liquidacion' });
  }
};

const downloadLiquidacionPdf = async (req, res) => {
  try {
    const { id_liquidacion } = req.params;
    const isAdminOrRRHH = req.user?.rol === 'ADMINISTRADOR' || req.user?.rol === 'RRHH';
    const isEmployee = req.user?.rol === 'EMPLEADO';

    if (!isAdminOrRRHH && !isEmployee) {
      return res.status(403).json({ success: false, message: 'Sin permisos' });
    }

    const [liqRows] = await pool.query(
      `SELECT l.*, CONCAT(e.nombres, ' ', e.apellidos) AS empleado,
        e.numero_identificacion, e.tipo_identificacion, e.fecha_ingreso,
        c.nombre_cargo, d.nombre_departamento
      FROM liquidaciones l
      INNER JOIN empleados e ON e.id_empleado = l.id_empleado
      LEFT JOIN cargos c ON c.id_cargo = e.id_cargo
      LEFT JOIN departamentos d ON d.id_departamento = e.id_departamento
      WHERE l.id_liquidacion = ?`,
      [id_liquidacion]
    );

    if (liqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Liquidacion no encontrada' });
    }

    if (isEmployee && Number(req.user.id_empleado) !== Number(liqRows[0].id_empleado)) {
      return res.status(403).json({ success: false, message: 'No puedes descargar una liquidacion que no te pertenece' });
    }

    const [detalleRows] = await pool.query(
      `SELECT concepto, tipo, valor FROM detalle_liquidacion WHERE id_liquidacion = ?`,
      [id_liquidacion]
    );

    const pdfBuffer = await generateLiquidacionPdfBuffer({
      liquidacion: liqRows[0],
      detalle: detalleRows,
      empleado: liqRows[0].empleado
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=liquidacion-${id_liquidacion}.pdf`);

    return res.send(pdfBuffer);
  } catch (error) {
    logger.error('Error generando PDF liquidacion:', error.message);
    return res.status(500).json({ success: false, message: 'Error generando PDF' });
  }
};

const getRecontratacionConfig = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT meses_espera_recontratacion, dias_espera_recontratacion 
       FROM parametros_nomina LIMIT 1`
    );

    const config = rows.length > 0 ? rows[0] : { meses_espera_recontratacion: 0, dias_espera_recontratacion: 0 };

    return res.json({
      success: true,
      data: {
        meses: config.meses_espera_recontratacion,
        dias: config.dias_espera_recontratacion
      }
    });
  } catch (error) {
    logger.error('Error obteniendo config recontratacion:', error.message);
    return res.status(500).json({ success: false, message: 'Error obteniendo configuracion' });
  }
};

const updateRecontratacionConfig = async (req, res) => {
  try {
    const { meses, dias } = req.body;

    if (meses === undefined || dias === undefined) {
      return res.status(400).json({ success: false, message: 'meses y dias son obligatorios' });
    }

    const nMeses = Math.max(0, parseInt(meses) || 0);
    const nDias = Math.max(0, parseInt(dias) || 0);

    const [existing] = await pool.query('SELECT id_parametro FROM parametros_nomina LIMIT 1');

    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO parametros_nomina (meses_espera_recontratacion, dias_espera_recontratacion) 
         VALUES (?, ?)`,
        [nMeses, nDias]
      );
    } else {
      await pool.query(
        `UPDATE parametros_nomina SET meses_espera_recontratacion = ?, dias_espera_recontratacion = ? 
         WHERE id_parametro = ?`,
        [nMeses, nDias, existing[0].id_parametro]
      );
    }

    return res.json({
      success: true,
      message: 'Configuracion de recontratacion actualizada exitosamente',
      data: { meses: nMeses, dias: nDias }
    });
  } catch (error) {
    logger.error('Error actualizando config recontratacion:', error.message);
    return res.status(500).json({ success: false, message: 'Error actualizando configuracion' });
  }
};

const getJornadaLaboralConfig = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT jornada_laboral_defecto
       FROM parametros_nomina LIMIT 1`
    );

    const jornada = rows.length > 0 ? rows[0].jornada_laboral_defecto : 'LUNES_VIERNES';

    return res.json({
      success: true,
      data: { jornada_laboral: jornada }
    });
  } catch (error) {
    logger.error('Error obteniendo jornada laboral:', error.message);
    return res.status(500).json({ success: false, message: 'Error obteniendo configuracion' });
  }
};

const updateJornadaLaboralConfig = async (req, res) => {
  try {
    const { jornada_laboral } = req.body;

    if (!jornada_laboral || !['LUNES_VIERNES', 'LUNES_SABADO'].includes(jornada_laboral)) {
      return res.status(400).json({ success: false, message: 'jornada_laboral debe ser LUNES_VIERNES o LUNES_SABADO' });
    }

    const [existing] = await pool.query('SELECT id_parametro FROM parametros_nomina LIMIT 1');

    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO parametros_nomina (jornada_laboral_defecto) VALUES (?)`,
        [jornada_laboral]
      );
    } else {
      await pool.query(
        `UPDATE parametros_nomina SET jornada_laboral_defecto = ? WHERE id_parametro = ?`,
        [jornada_laboral, existing[0].id_parametro]
      );
    }

    return res.json({
      success: true,
      message: 'Configuracion de jornada laboral actualizada exitosamente',
      data: { jornada_laboral }
    });
  } catch (error) {
    logger.error('Error actualizando jornada laboral:', error.message);
    return res.status(500).json({ success: false, message: 'Error actualizando configuracion' });
  }
};

const revertirPago = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_liquidacion } = req.params;
    const { reactivar } = req.body; // boolean

    const [liqRows] = await connection.query(
      "SELECT id_liquidacion, id_empleado, estado FROM liquidaciones WHERE id_liquidacion = ?",
      [id_liquidacion]
    );

    if (liqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Liquidación no encontrada' });
    }

    if (liqRows[0].estado !== 'PAGADA') {
      return res.status(400).json({ success: false, message: 'Solo se pueden revertir liquidaciones pagadas' });
    }

    await connection.beginTransaction();

    // Revertir estado a PENDIENTE
    await connection.query(
      "UPDATE liquidaciones SET estado = 'PENDIENTE' WHERE id_liquidacion = ?",
      [id_liquidacion]
    );

    // Reactivar empleado si se solicita
    if (reactivar) {
      await connection.query(
        "UPDATE empleados SET activo = TRUE, eliminado_en = NULL, fecha_retiro = NULL WHERE id_empleado = ?",
        [liqRows[0].id_empleado]
      );
      // Reactivar usuario si tiene
      await connection.query(
        "UPDATE usuarios SET activo = TRUE WHERE id_empleado = ?",
        [liqRows[0].id_empleado]
      );
    }

    await connection.commit();

    return res.json({ 
      success: true, 
      message: reactivar 
        ? 'Pago revertido y empleado reactivado exitosamente' 
        : 'Pago revertido exitosamente' 
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Error revertiendo pago:', error.message);
    return res.status(500).json({ success: false, message: 'Error al revertir el pago' });
  } finally {
    connection.release();
  }
};

const revertirAnulacion = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_liquidacion } = req.params;

    const [liqRows] = await connection.query(
      "SELECT id_liquidacion, id_empleado, estado FROM liquidaciones WHERE id_liquidacion = ?",
      [id_liquidacion]
    );

    if (liqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Liquidación no encontrada' });
    }

    if (liqRows[0].estado !== 'ANULADA') {
      return res.status(400).json({ success: false, message: 'Solo se pueden revertir liquidaciones anuladas' });
    }

    await connection.beginTransaction();

    // Revertir estado a PENDIENTE
    await connection.query(
      "UPDATE liquidaciones SET estado = 'PENDIENTE' WHERE id_liquidacion = ?",
      [id_liquidacion]
    );

    // Desactivar empleado (ya que la anulación lo reactivó)
    await connection.query(
      "UPDATE empleados SET activo = FALSE, eliminado_en = NOW() WHERE id_empleado = ?",
      [liqRows[0].id_empleado]
    );
    // Desactivar usuario si tiene
    await connection.query(
      "UPDATE usuarios SET activo = FALSE WHERE id_empleado = ?",
      [liqRows[0].id_empleado]
    );

    await connection.commit();

    return res.json({ 
      success: true, 
      message: 'Anulación revertida exitosamente. El empleado ha sido desactivado nuevamente.' 
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Error revertiendo anulación:', error.message);
    return res.status(500).json({ success: false, message: 'Error al revertir la anulación' });
  } finally {
    connection.release();
  }
};

const deleteLiquidacion = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_liquidacion } = req.params;

    const [liqRows] = await connection.query(
      "SELECT id_liquidacion, id_empleado, estado FROM liquidaciones WHERE id_liquidacion = ?",
      [id_liquidacion]
    );

    if (liqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Liquidación no encontrada' });
    }

    const { id_empleado, estado } = liqRows[0];

    await connection.beginTransaction();

    // Si la liquidación estaba PENDIENTE o PAGADA, al eliminarla reactivamos al empleado
    // para que no quede en el limbo (ya que guardar liquidación lo desactiva).
    if (estado !== 'ANULADA') {
      await connection.query(
        "UPDATE empleados SET activo = TRUE, eliminado_en = NULL, fecha_retiro = NULL WHERE id_empleado = ?",
        [id_empleado]
      );
      await connection.query(
        "UPDATE usuarios SET activo = TRUE WHERE id_empleado = ?",
        [id_empleado]
      );
    }

    await connection.query("DELETE FROM liquidaciones WHERE id_liquidacion = ?", [id_liquidacion]);

    await connection.commit();

    return res.json({ success: true, message: 'Liquidación eliminada exitosamente' });
  } catch (error) {
    await connection.rollback();
    logger.error('Error eliminando liquidación:', error.message);
    return res.status(500).json({ success: false, message: 'Error al eliminar la liquidación' });
  } finally {
    connection.release();
  }
};

module.exports = {
  calcularLiquidacion,
  guardarLiquidacion,
  getLiquidaciones,
  getLiquidacionById,
  anularLiquidacion,
  marcarPagada,
  downloadLiquidacionPdf,
  getRecontratacionConfig,
  updateRecontratacionConfig,
  getJornadaLaboralConfig,
  updateJornadaLaboralConfig,
  revertirPago,
  revertirAnulacion,
  deleteLiquidacion
};
