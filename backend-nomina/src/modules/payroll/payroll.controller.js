const { pool } = require('../../config/database');
const { generatePayrollPdfBuffer } = require('./payroll-pdf.service');
const { VALID_PAYMENT_TYPES, VALID_OVERTIME_TYPES } = require('./payroll.constants');
const {
  getPayrollNoveltiesForPeriod,
  buildPayrollNoveltyDetailRows,
  buildAppliedNoveltyRows
} = require('./payroll.helpers');

const createPayroll = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      id_empleado,
      fecha_inicio,
      fecha_corte,
      tipo_pago,
      total_devengado,
      total_deducciones,
      detalles = [],
      horas_extras = []
    } = req.body;

    if (!id_empleado || !fecha_inicio || !fecha_corte) {
      return res.status(400).json({
        success: false,
        message: 'id_empleado, fecha_inicio y fecha_corte son obligatorios'
      });
    }

    if (new Date(fecha_corte) < new Date(fecha_inicio)) {
      return res.status(400).json({
        success: false,
        message: 'fecha_corte no puede ser menor a fecha_inicio'
      });
    }

    const paymentType = VALID_PAYMENT_TYPES.has(tipo_pago) ? tipo_pago : 'MENSUAL';
    const baseDevengado = Number(total_devengado) || 0;
    const baseDeducciones = Number(total_deducciones) || 0;

    if (baseDevengado < 0 || baseDeducciones < 0) {
      return res.status(400).json({
        success: false,
        message: 'Los valores de nomina no pueden ser negativos'
      });
    }

    const overtimeRows = Array.isArray(horas_extras)
      ? horas_extras
        .filter((item) => item && VALID_OVERTIME_TYPES.has(item.tipo_hora))
        .map((item) => ({
          tipo_hora: item.tipo_hora,
          porcentaje_recargo: Number(item.porcentaje_recargo) || 0,
          horas: Number(item.horas) || 0,
          valor_hora_base: Number(item.valor_hora_base) || 0,
          valor_hora_extra: Number(item.valor_hora_extra) || 0,
          valor_total: Number(item.valor_total) || 0
        }))
        .filter((item) => item.horas > 0 && item.valor_total >= 0)
      : [];

    // Busca novedades aprobadas del periodo antes de guardar la nómina.
    // Su impacto se suma automaticamente al devengado o a las deducciones.
    const payrollNovelties = await getPayrollNoveltiesForPeriod({
      db: connection,
      idEmpleado: id_empleado,
      fechaInicio: fecha_inicio,
      fechaCorte: fecha_corte
    });

    const novelties = payrollNovelties.novedades || [];
    const noveltySummary = payrollNovelties.resumen || {
      totalDevengado: 0,
      totalDeducciones: 0
    };
    const finalDevengado = Number((baseDevengado + Number(noveltySummary.totalDevengado || 0)).toFixed(2));
    const finalDeducciones = Number((baseDeducciones + Number(noveltySummary.totalDeducciones || 0)).toFixed(2));

    await connection.beginTransaction();

    // Evita duplicar la misma nómina para un empleado y el mismo rango de fechas.
    const [existingPayrollRows] = await connection.query(
      `SELECT id_nomina
       FROM nomina
       WHERE id_empleado = ?
         AND fecha_inicio = ?
         AND fecha_corte = ?
       LIMIT 1
       FOR UPDATE`,
      [id_empleado, fecha_inicio, fecha_corte]
    );

    if (existingPayrollRows.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'Ya existe una nomina registrada para este empleado y periodo'
      });
    }

    const [payrollResult] = await connection.query(
      `INSERT INTO nomina (id_empleado, fecha_inicio, fecha_corte, tipo_pago, total_devengado, total_deducciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_empleado, fecha_inicio, fecha_corte, paymentType, finalDevengado, finalDeducciones]
    );

    const idNomina = payrollResult.insertId;
    const manualDetailRows = Array.isArray(detalles) && detalles.length > 0
      ? detalles
          .filter((item) => item && item.concepto && Number(item.valor) >= 0)
          .map((item) => [idNomina, String(item.concepto).slice(0, 100), Number(item.valor)])
      : [];
    const noveltyDetailRows = buildPayrollNoveltyDetailRows(idNomina, novelties);
    const appliedNoveltyRows = buildAppliedNoveltyRows(idNomina, novelties);
    const mergedDetailRows = [...manualDetailRows, ...noveltyDetailRows];

    if (mergedDetailRows.length > 0) {
      await connection.query(
        `INSERT INTO detalle_nomina (id_nomina, concepto, valor) VALUES ?`,
        [mergedDetailRows]
      );
    }

    if (overtimeRows.length > 0) {
      const overtimeInsertRows = overtimeRows.map((row) => [
        idNomina,
        row.tipo_hora,
        row.porcentaje_recargo,
        row.horas,
        row.valor_hora_base,
        row.valor_hora_extra,
        row.valor_total
      ]);

      await connection.query(
        `INSERT INTO horas_extra_nomina
          (id_nomina, tipo_hora, porcentaje_recargo, horas, valor_hora_base, valor_hora_extra, valor_total)
         VALUES ?`,
        [overtimeInsertRows]
      );
    }

    if (appliedNoveltyRows.length > 0) {
      await connection.query(
        `INSERT INTO nomina_novedades_aplicadas
          (id_nomina, id_solicitud, categoria, concepto, cantidad, unidad, porcentaje_aplicado, valor_aplicado)
         VALUES ?`,
        [appliedNoveltyRows]
      );

      const settledRequestIds = [...new Set(appliedNoveltyRows.map((row) => Number(row[1])).filter(Boolean))];
      if (settledRequestIds.length > 0) {
        await connection.query(
          `UPDATE solicitudes_laborales
           SET pendiente_liquidacion = 0,
               liquidada_en_nomina = 1,
               fecha_liquidacion = CURRENT_TIMESTAMP
           WHERE id_solicitud IN (?)`,
          [settledRequestIds]
        );
      }
    }

    const corteDate = new Date(fecha_corte);
    const anio = corteDate.getUTCFullYear();
    const mes = corteDate.getUTCMonth() + 1;
    const totalHorasExtra = overtimeRows.reduce((acc, row) => acc + row.horas, 0);
    const valorHorasExtra = overtimeRows.reduce((acc, row) => acc + row.valor_total, 0);

    await connection.query(
      `INSERT INTO reporte_nomina_mensual
        (anio, mes, total_nominas, total_devengado, total_deducciones, total_pagado, total_horas_extra, valor_horas_extra)
       VALUES (?, ?, 1, ?, ?, (? - ?), ?, ?)
       ON DUPLICATE KEY UPDATE
         total_nominas = total_nominas + 1,
         total_devengado = total_devengado + VALUES(total_devengado),
         total_deducciones = total_deducciones + VALUES(total_deducciones),
         total_pagado = total_pagado + VALUES(total_pagado),
         total_horas_extra = total_horas_extra + VALUES(total_horas_extra),
         valor_horas_extra = valor_horas_extra + VALUES(valor_horas_extra)`,
      [anio, mes, finalDevengado, finalDeducciones, finalDevengado, finalDeducciones, totalHorasExtra, valorHorasExtra]
    );

    await connection.commit();

    const [savedPayrollRows] = await connection.query(
      `SELECT id_nomina, id_empleado, fecha_inicio, fecha_corte, tipo_pago, total_devengado, total_deducciones, total_pagar
       FROM nomina
       WHERE id_nomina = ?`,
      [idNomina]
    );

    return res.status(201).json({
      success: true,
      message: 'Nomina guardada exitosamente',
      data: {
        ...savedPayrollRows[0],
        novedades_aplicadas: novelties,
        resumen_novedades: payrollNovelties.resumen
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creando nomina:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error guardando la nomina'
    });
  } finally {
    connection.release();
  }
};

// Muestra las solicitudes aprobadas que impactarian una nómina del periodo.
// Sirve como paso previo para validar reglas antes de integrarlas al guardado final.
const getPayrollNoveltiesPreview = async (req, res) => {
  try {
    const idEmpleado = Number(req.query.id_empleado);
    const fechaInicio = req.query.fecha_inicio;
    const fechaCorte = req.query.fecha_corte;

    if (!idEmpleado || !fechaInicio || !fechaCorte) {
      return res.status(400).json({
        success: false,
        message: 'id_empleado, fecha_inicio y fecha_corte son obligatorios'
      });
    }

    if (new Date(fechaCorte) < new Date(fechaInicio)) {
      return res.status(400).json({
        success: false,
        message: 'fecha_corte no puede ser menor a fecha_inicio'
      });
    }

    const payrollNovelties = await getPayrollNoveltiesForPeriod({
      db: pool,
      idEmpleado,
      fechaInicio,
      fechaCorte
    });

    return res.json({
      success: true,
      data: {
        id_empleado: idEmpleado,
        fecha_inicio: fechaInicio,
        fecha_corte: fechaCorte,
        empleado: payrollNovelties.empleado,
        resumen: payrollNovelties.resumen,
        novedades: payrollNovelties.novedades
      }
    });
  } catch (error) {
    console.error('Error obteniendo novedades de nomina:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo las novedades de nomina'
    });
  }
};

const getPayrollReport = async (req, res) => {
  try {
    const now = new Date();
    const requestedYear = Number(req.query.anio) || now.getUTCFullYear();
    const requestedEmployeeId = Number(req.query.id_empleado) || null;
    const isAdminOrRRHH = req.user?.rol === 'ADMINISTRADOR' || req.user?.rol === 'RRHH';
    const isEmployee = req.user?.rol === 'EMPLEADO';
    const authenticatedEmployeeId = Number(req.user?.id_empleado) || null;

    const hasMonthFilter = req.query.mes !== undefined && req.query.mes !== null && req.query.mes !== '';
    const requestedMonth = hasMonthFilter ? Number(req.query.mes) : null;

    if (hasMonthFilter && (requestedMonth < 1 || requestedMonth > 12)) {
      return res.status(400).json({
        success: false,
        message: 'El parametro mes debe estar entre 1 y 12'
      });
    }

    if (requestedYear < 2000 || requestedYear > 2100) {
      return res.status(400).json({
        success: false,
        message: 'El parametro anio debe estar entre 2000 y 2100'
      });
    }

    if (!isAdminOrRRHH && !isEmployee) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para consultar reportes de nomina'
      });
    }

    if (isEmployee && !authenticatedEmployeeId) {
      return res.status(403).json({
        success: false,
        message: 'Tu usuario no tiene un empleado asociado para consultar reportes'
      });
    }

    const finalEmployeeId = isAdminOrRRHH ? requestedEmployeeId : authenticatedEmployeeId;

    const queryParams = [requestedYear];
    let monthFilterSql = '';
    let employeeFilterSql = '';

    if (hasMonthFilter) {
      monthFilterSql = ' AND MONTH(n.fecha_corte) = ? ';
      queryParams.push(requestedMonth);
    }

    if (finalEmployeeId) {
      employeeFilterSql = ' AND n.id_empleado = ? ';
      queryParams.push(finalEmployeeId);
    }

    const [rows] = await pool.query(
      `SELECT
        n.id_nomina,
        n.id_empleado,
        CONCAT(e.nombres, ' ', e.apellidos) AS empleado,
        e.sueldo AS salario_basico,
        c.nombre_cargo AS cargo,
        d.nombre_departamento AS departamento,
        n.fecha_inicio,
        n.fecha_corte,
        n.tipo_pago,
        n.total_devengado,
        n.total_deducciones,
        n.total_pagar,
        COALESCE(he.heo, 0) AS heo,
        COALESCE(he.hef, 0) AS hef,
        COALESCE(he.hen, 0) AS hen,
        COALESCE(he.hefn, 0) AS hefn,
        COALESCE(dd.salud, 0) AS deduccion_salud,
        COALESCE(dd.arl, 0) AS deduccion_arl,
        COALESCE(dd.pension, 0) AS deduccion_pension
      FROM nomina n
      INNER JOIN empleados e ON e.id_empleado = n.id_empleado
      LEFT JOIN cargos c ON c.id_cargo = e.id_cargo
      LEFT JOIN departamentos d ON d.id_departamento = e.id_departamento
      LEFT JOIN (
        SELECT
          id_nomina,
          SUM(CASE WHEN tipo_hora = 'EXTRA_DIURNA' THEN horas ELSE 0 END) AS heo,
          SUM(CASE WHEN tipo_hora = 'EXTRA_DIURNA_DOMINICAL_FESTIVO' THEN horas ELSE 0 END) AS hef,
          SUM(CASE WHEN tipo_hora = 'EXTRA_NOCTURNA' THEN horas ELSE 0 END) AS hen,
          SUM(CASE WHEN tipo_hora = 'EXTRA_NOCTURNA_DOMINICAL_FESTIVO' THEN horas ELSE 0 END) AS hefn
        FROM horas_extra_nomina
        GROUP BY id_nomina
      ) he ON he.id_nomina = n.id_nomina
      LEFT JOIN (
        SELECT
          id_nomina,
          SUM(CASE WHEN LOWER(concepto) LIKE '%salud%' THEN valor ELSE 0 END) AS salud,
          SUM(CASE WHEN LOWER(concepto) LIKE '%arl%' THEN valor ELSE 0 END) AS arl,
          SUM(CASE WHEN LOWER(concepto) LIKE '%pensi%' THEN valor ELSE 0 END) AS pension
        FROM detalle_nomina
        GROUP BY id_nomina
      ) dd ON dd.id_nomina = n.id_nomina
      WHERE YEAR(n.fecha_corte) = ?
        ${monthFilterSql}
        ${employeeFilterSql}
      ORDER BY n.fecha_corte DESC, n.id_nomina DESC`,
      queryParams
    );

    const resumen = rows.reduce((acc, row) => ({
      totalNominas: acc.totalNominas + 1,
      totalDevengado: acc.totalDevengado + (Number(row.total_devengado) || 0),
      totalDeducciones: acc.totalDeducciones + (Number(row.total_deducciones) || 0),
      totalPagado: acc.totalPagado + (Number(row.total_pagar) || 0)
    }), {
      totalNominas: 0,
      totalDevengado: 0,
      totalDeducciones: 0,
      totalPagado: 0
    });

    return res.json({
      success: true,
      data: {
        filtros: {
          anio: requestedYear,
          mes: hasMonthFilter ? requestedMonth : null,
          id_empleado: finalEmployeeId
        },
        resumen,
        nominas: rows
      }
    });
  } catch (error) {
    console.error('Error obteniendo reporte de nomina:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo el reporte de nomina'
    });
  }
};

const getPayrollById = async (req, res) => {
  try {
    const idNomina = Number(req.params.id_nomina);

    if (!idNomina) {
      return res.status(400).json({
        success: false,
        message: 'Debes indicar un id_nomina valido'
      });
    }

    const [payrollRows] = await pool.query(
      `SELECT
        n.id_nomina,
        n.id_empleado,
        CONCAT(e.nombres, ' ', e.apellidos) AS empleado,
        c.nombre_cargo AS cargo,
        d.nombre_departamento AS departamento,
        n.fecha_inicio,
        n.fecha_corte,
        n.tipo_pago,
        n.total_devengado,
        n.total_deducciones,
        n.total_pagar
      FROM nomina n
      INNER JOIN empleados e ON e.id_empleado = n.id_empleado
      LEFT JOIN cargos c ON c.id_cargo = e.id_cargo
      LEFT JOIN departamentos d ON d.id_departamento = e.id_departamento
      WHERE n.id_nomina = ?
      LIMIT 1`,
      [idNomina]
    );

    if (payrollRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nomina no encontrada'
      });
    }

    const payroll = payrollRows[0];
    const isAdminOrRRHH = req.user?.rol === 'ADMINISTRADOR' || req.user?.rol === 'RRHH';
    const authenticatedEmployeeId = Number(req.user?.id_empleado) || null;

    if (!isAdminOrRRHH && authenticatedEmployeeId !== Number(payroll.id_empleado)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para consultar esta nomina'
      });
    }

    const [detailRows] = await pool.query(
      `SELECT concepto, valor
       FROM detalle_nomina
       WHERE id_nomina = ?
       ORDER BY id_detalle ASC`,
      [idNomina]
    );

    const [overtimeRows] = await pool.query(
      `SELECT tipo_hora, horas, valor_total
       FROM horas_extra_nomina
       WHERE id_nomina = ?
       ORDER BY id_hora_extra ASC`,
      [idNomina]
    );

    const [noveltyRows] = await pool.query(
      `SELECT
        nna.id_solicitud,
        nna.categoria,
        nna.concepto,
        nna.cantidad,
        nna.unidad,
        nna.porcentaje_aplicado,
        nna.valor_aplicado,
        s.tipo,
        s.sub_tipo,
        s.fecha_inicio,
        s.fecha_fin
      FROM nomina_novedades_aplicadas nna
      INNER JOIN solicitudes_laborales s ON s.id_solicitud = nna.id_solicitud
      WHERE nna.id_nomina = ?
      ORDER BY nna.id_nomina_novedad ASC`,
      [idNomina]
    );

    return res.json({
      success: true,
      data: {
        nomina: payroll,
        detalle_nomina: detailRows,
        horas_extra: overtimeRows,
        novedades_aplicadas: noveltyRows
      }
    });
  } catch (error) {
    console.error('Error obteniendo detalle de nomina:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo detalle de nomina'
    });
  }
};

const downloadPayrollPdf = async (req, res) => {
  console.log("1. Inicio descarga PDF");
  try {
    const { id_nomina } = req.params;

    if (!id_nomina) {
      return res.status(400).json({
        success: false,
        message: 'El id de la nomina es obligatorio'
      });
    }

    const [payrollRows] = await pool.query(
      `SELECT
        n.id_nomina,
        n.id_empleado,
        n.fecha_inicio,
        n.fecha_corte,
        n.tipo_pago,
        n.total_devengado,
        n.total_deducciones,
        n.total_pagar,
        e.nombres,
        e.apellidos,
        e.tipo_identificacion,
        e.numero_identificacion,
        e.sueldo,
        c.nombre_cargo,
        d.nombre_departamento
      FROM nomina n
      INNER JOIN empleados e ON e.id_empleado = n.id_empleado
      INNER JOIN cargos c ON c.id_cargo = e.id_cargo
      INNER JOIN departamentos d ON d.id_departamento = e.id_departamento
      WHERE n.id_nomina = ?`,
      [id_nomina]
    );
    console.log("2. Datos nómina");

    if (payrollRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nomina no encontrada'
      });
    }

    const payroll = payrollRows[0];

    const isAdminOrRRHH = req.user?.rol === 'ADMINISTRADOR' || req.user?.rol === 'RRHH';
    const authenticatedEmployeeId = Number(req.user?.id_empleado) || null;
    const payrollEmployeeId = Number(payroll.id_empleado);

    if (!isAdminOrRRHH && authenticatedEmployeeId !== payrollEmployeeId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para descargar esta nomina'
      });
    }

    const [detailRows] = await pool.query(
      `SELECT concepto, valor
      FROM detalle_nomina
      WHERE id_nomina = ?`,
      [id_nomina]
    );
    console.log("3. Detalles");

    const [overtimeRows] = await pool.query(
      `SELECT
      tipo_hora,
      porcentaje_recargo,
      horas,
      valor_hora_base,
      valor_hora_extra,
      valor_total
      FROM horas_extra_nomina
      WHERE id_nomina = ?`,
      [id_nomina]
    );console.log("4. Horas extra");

    const pdfBuffer = await generatePayrollPdfBuffer({
      payroll,
      detailRows,
      overtimeRows
    });
    console.log("5. PDF generado");

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=nomina-${payroll.id_nomina}.pdf`
    );

    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generando PDF de nomina:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error generando el PDF de nomina'
    });
  }
};

module.exports = {
  createPayroll,
  getPayrollReport,
  getPayrollById,
  downloadPayrollPdf,
  getPayrollNoveltiesPreview,
  getPayrollNoveltiesForPeriod
};
