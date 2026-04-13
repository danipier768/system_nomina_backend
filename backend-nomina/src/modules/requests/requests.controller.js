const { pool } = require('../../config/database');
const {
  VACATION_TYPE,
  PERMISSION_TYPE,
  DISABILITY_TYPE,
  LICENSE_TYPE,
  PENDING_STATUS,
  VISIBLE_REQUEST_STATUSES
} = require('./requests.constants');
const {
  calculateRequestedDays,
  getPayrollImpactData,
  getAutomaticPayrollImpactDataForEmployee,
  validatePayrollImpactData,
  getEmployeeIdForRequest,
  saveSupportFile,
  buildApprovalPayrollSnapshot
} = require('./requests.helpers');

// Obtiene una solicitud por id para centralizar la validacion previa
// antes de aprobarla o rechazarla.
const getRequestById = async (idSolicitud) => {
  const [rows] = await pool.query(
    `SELECT
      s.id_solicitud,
      s.id_empleado,
      s.tipo,
      s.sub_tipo,
      s.fecha_inicio,
      s.fecha_fin,
      s.dias_solicitados,
      s.horas_solicitadas,
      s.es_remunerado,
      s.porcentaje_pago,
      s.origen_novedad,
      s.estado,
      s.pendiente_liquidacion
    FROM solicitudes_laborales s
    WHERE s.id_solicitud = ?
    LIMIT 1`,
    [idSolicitud]
  );

  return rows[0] || null;
};

// Crea solicitudes simples basadas en rango de fechas y estado inicial pendiente.
// Se usa para tipos que no requieren saldo ni reglas especiales, como permisos.
const createBasicLaborRequest = async ({
  req,
  res,
  requestType,
  successMessage
}) => {
  try {
    const idEmpleado = getEmployeeIdForRequest(req);
    const {
      fecha_inicio,
      fecha_fin,
      comentario_empleado,
      documento_soporte,
      sub_tipo,
      support_file
    } = req.body;

    if (!idEmpleado) {
      return res.status(400).json({
        success: false,
        message: 'Debes indicar un empleado valido para la solicitud'
      });
    }

    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        message: 'fecha_inicio y fecha_fin son obligatorios'
      });
    }

    if (req.user?.rol === 'EMPLEADO' && !req.user?.id_empleado) {
      return res.status(403).json({
        success: false,
        message: 'Tu usuario no tiene un empleado asociado'
      });
    }

    const payrollImpactData = req.user?.rol === 'EMPLEADO'
      ? getAutomaticPayrollImpactDataForEmployee({
          requestType,
          body: req.body
        })
      : getPayrollImpactData({
          requestType,
          body: req.body
        });

    const payrollValidationError = validatePayrollImpactData({
      requestType,
      payrollImpactData
    });

    if (payrollValidationError) {
      return res.status(400).json({
        success: false,
        message: payrollValidationError
      });
    }

    const requestedDays = Number(req.body.dias_solicitados) || calculateRequestedDays(fecha_inicio, fecha_fin);

    if (requestedDays <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Los dias solicitados deben ser mayores a cero'
      });
    }

    if (new Date(fecha_fin) < new Date(fecha_inicio)) {
      return res.status(400).json({
        success: false,
        message: 'La fecha_fin no puede ser menor a la fecha_inicio'
      });
    }

    const [employeeRows] = await pool.query(
      `SELECT id_empleado FROM empleados WHERE id_empleado = ?`,
      [idEmpleado]
    );

    if (employeeRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado'
      });
    }

    // Si se envia adjunto, se guarda primero y se almacena su ruta publica.
    const supportFilePath = support_file
      ? await saveSupportFile({
          supportFile: support_file,
          requestType,
          employeeId: idEmpleado
        })
      : null;

    const [result] = await pool.query(
      `INSERT INTO solicitudes_laborales
        (id_empleado, tipo, sub_tipo, fecha_inicio, fecha_fin, dias_solicitados, horas_solicitadas, es_remunerado, porcentaje_pago, origen_novedad, estado, comentario_empleado, documento_soporte)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idEmpleado,
        requestType,
        sub_tipo || null,
        fecha_inicio,
        fecha_fin,
        requestedDays,
        payrollImpactData.horasSolicitadas,
        payrollImpactData.esRemunerado,
        payrollImpactData.porcentajePago,
        payrollImpactData.origenNovedad,
        PENDING_STATUS,
        comentario_empleado || null,
        supportFilePath || documento_soporte || null
      ]
    );

    const [createdRows] = await pool.query(
      `SELECT
        s.id_solicitud,
        s.id_empleado,
        s.tipo,
        s.sub_tipo,
        s.fecha_inicio,
        s.fecha_fin,
        s.dias_solicitados,
        s.horas_solicitadas,
        s.es_remunerado,
        s.porcentaje_pago,
        s.origen_novedad,
        s.estado,
        s.comentario_empleado,
        s.documento_soporte,
        s.fecha_solicitud,
        CONCAT(e.nombres, ' ', e.apellidos) AS empleado
      FROM solicitudes_laborales s
      INNER JOIN empleados e ON e.id_empleado = s.id_empleado
      WHERE s.id_solicitud = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: successMessage,
      data: createdRows[0]
    });
  } catch (error) {
    console.error(`Error creando solicitud ${requestType.toLowerCase()}:`, error.message);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: `Error creando la solicitud de ${requestType.toLowerCase()}`
    });
  }
};

// Cambia el estado de solicitudes simples sin afectar saldos.
// Se usa para permisos, porque no descuentan vacaciones.
const updateBasicRequestStatus = async ({
  req,
  res,
  expectedType,
  expectedCurrentStatuses,
  nextStatus,
  successMessage
}) => {
  try {
    const idSolicitud = Number(req.params.id);
    const comentarioAprobador = req.body.comentario_aprobador || req.body.comentario_cancelacion || null;

    if (!idSolicitud) {
      return res.status(400).json({
        success: false,
        message: 'Debes indicar un id de solicitud valido'
      });
    }

    const request = await getRequestById(idSolicitud);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    if (request.tipo !== expectedType) {
      return res.status(400).json({
        success: false,
        message: `Esta accion solo esta disponible para solicitudes de ${expectedType.toLowerCase()}`
      });
    }

    if (!expectedCurrentStatuses.includes(request.estado)) {
      return res.status(409).json({
        success: false,
        message: `La solicitud debe estar en estado ${expectedCurrentStatuses.join(' o ')}`
      });
    }

    await pool.query(
      `UPDATE solicitudes_laborales
       SET estado = ?,
           comentario_aprobador = ?,
           fecha_respuesta = CURRENT_TIMESTAMP,
           aprobado_por = ?,
           pendiente_liquidacion = ?,
           liquidada_en_nomina = 0,
           fecha_liquidacion = NULL,
           impacto_nomina_calculado = ?
       WHERE id_solicitud = ?`,
      [
        nextStatus,
        comentarioAprobador,
        req.user.id_usuario,
        nextStatus === 'APROBADA' ? 1 : 0,
        nextStatus === 'APROBADA'
          ? JSON.stringify(buildApprovalPayrollSnapshot({ requestRow: request }))
          : null,
        idSolicitud
      ]
    );

    const [updatedRows] = await pool.query(
      `SELECT
        s.id_solicitud,
        s.id_empleado,
        s.tipo,
        s.sub_tipo,
        s.fecha_inicio,
        s.fecha_fin,
        s.dias_solicitados,
        s.horas_solicitadas,
        s.es_remunerado,
        s.porcentaje_pago,
        s.origen_novedad,
        s.estado,
        s.pendiente_liquidacion,
        s.liquidada_en_nomina,
        s.fecha_liquidacion,
        s.comentario_empleado,
        s.comentario_aprobador,
        s.fecha_solicitud,
        s.fecha_respuesta,
        CONCAT(e.nombres, ' ', e.apellidos) AS empleado
      FROM solicitudes_laborales s
      INNER JOIN empleados e ON e.id_empleado = s.id_empleado
      WHERE s.id_solicitud = ?`,
      [idSolicitud]
    );

    return res.json({
      success: true,
      message: successMessage,
      data: updatedRows[0]
    });
  } catch (error) {
    console.error(`Error actualizando solicitud ${expectedType.toLowerCase()}:`, error.message);
    return res.status(500).json({
      success: false,
      message: `Error gestionando la solicitud de ${expectedType.toLowerCase()}`
    });
  }
};

// Crea una solicitud de vacaciones validando:
// 1. empleado valido
// 2. fechas correctas
// 3. saldo disponible
// 4. ausencia de traslapes con otras solicitudes activas
const createVacationRequest = async (req, res) => {
  try {
    const idEmpleado = getEmployeeIdForRequest(req);
    const {
      fecha_inicio,
      fecha_fin,
      comentario_empleado,
      documento_soporte,
      sub_tipo,
      support_file
    } = req.body;

    if (!idEmpleado) {
      return res.status(400).json({
        success: false,
        message: 'Debes indicar un empleado valido para la solicitud'
      });
    }

    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        message: 'fecha_inicio y fecha_fin son obligatorios'
      });
    }

    if (req.user?.rol === 'EMPLEADO' && !req.user?.id_empleado) {
      return res.status(403).json({
        success: false,
        message: 'Tu usuario no tiene un empleado asociado'
      });
    }

    const payrollImpactData = getPayrollImpactData({
      requestType: VACATION_TYPE,
      body: req.body
    });

    // Si el cliente no envia dias_solicitados, se calculan automaticamente por rango.
    const requestedDays = Number(req.body.dias_solicitados) || calculateRequestedDays(fecha_inicio, fecha_fin);

    if (requestedDays <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Los dias solicitados deben ser mayores a cero'
      });
    }

    if (new Date(fecha_fin) < new Date(fecha_inicio)) {
      return res.status(400).json({
        success: false,
        message: 'La fecha_fin no puede ser menor a la fecha_inicio'
      });
    }

    const [employeeRows] = await pool.query(
      `SELECT id_empleado FROM empleados WHERE id_empleado = ?`,
      [idEmpleado]
    );

    if (employeeRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado'
      });
    }

    // Si se adjunta un soporte, se guarda antes de crear la solicitud.
    const supportFilePath = support_file
      ? await saveSupportFile({
          supportFile: support_file,
          requestType: VACATION_TYPE,
          employeeId: idEmpleado
        })
      : null;

    // El saldo se consulta por el anio de inicio de la solicitud.
    const periodYear = new Date(fecha_inicio).getUTCFullYear();

    const [balanceRows] = await pool.query(
      `SELECT id_saldo, id_empleado, periodo_anio, dias_ganados, dias_disfrutados, dias_pendientes
       FROM vacaciones_saldos
       WHERE id_empleado = ? AND periodo_anio = ?
       LIMIT 1`,
      [idEmpleado, periodYear]
    );

    if (balanceRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No existe saldo de vacaciones configurado para el empleado en el periodo ${periodYear}`
      });
    }

    const balance = balanceRows[0];

    // Se bloquea la creacion si el empleado no tiene dias suficientes.
    if (Number(balance.dias_pendientes) < requestedDays) {
      return res.status(400).json({
        success: false,
        message: 'El empleado no tiene saldo suficiente para esta solicitud',
        data: {
          dias_pendientes: Number(balance.dias_pendientes),
          dias_solicitados: requestedDays
        }
      });
    }

    // Se evita que el empleado tenga vacaciones activas en fechas cruzadas.
    const [overlapRows] = await pool.query(
      `SELECT id_solicitud
       FROM solicitudes_laborales
       WHERE id_empleado = ?
         AND tipo = ?
         AND estado IN (?, ?)
         AND fecha_inicio <= ?
         AND fecha_fin >= ?
       LIMIT 1`,
      [idEmpleado, VACATION_TYPE, ...VISIBLE_REQUEST_STATUSES, fecha_fin, fecha_inicio]
    );

    if (overlapRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una solicitud de vacaciones pendiente o aprobada en ese rango de fechas'
      });
    }

    // La solicitud siempre entra en estado PENDIENTE para revision posterior.
    const [result] = await pool.query(
      `INSERT INTO solicitudes_laborales
        (id_empleado, tipo, sub_tipo, fecha_inicio, fecha_fin, dias_solicitados, horas_solicitadas, es_remunerado, porcentaje_pago, origen_novedad, estado, comentario_empleado, documento_soporte)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idEmpleado,
        VACATION_TYPE,
        sub_tipo || null,
        fecha_inicio,
        fecha_fin,
        requestedDays,
        payrollImpactData.horasSolicitadas,
        payrollImpactData.esRemunerado,
        payrollImpactData.porcentajePago,
        payrollImpactData.origenNovedad,
        PENDING_STATUS,
        comentario_empleado || null,
        supportFilePath || documento_soporte || null
      ]
    );

    const [createdRows] = await pool.query(
      `SELECT
        s.id_solicitud,
        s.id_empleado,
        s.tipo,
        s.sub_tipo,
        s.fecha_inicio,
        s.fecha_fin,
        s.dias_solicitados,
        s.horas_solicitadas,
        s.es_remunerado,
        s.porcentaje_pago,
        s.origen_novedad,
        s.estado,
        s.comentario_empleado,
        s.documento_soporte,
        s.fecha_solicitud,
        CONCAT(e.nombres, ' ', e.apellidos) AS empleado
      FROM solicitudes_laborales s
      INNER JOIN empleados e ON e.id_empleado = s.id_empleado
      WHERE s.id_solicitud = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Solicitud de vacaciones creada exitosamente',
      data: createdRows[0]
    });
  } catch (error) {
    console.error('Error creando solicitud de vacaciones:', error.message);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error creando la solicitud de vacaciones'
    });
  }
};

// Crea una solicitud de permiso reutilizando el flujo base de solicitudes simples.
const createPermissionRequest = async (req, res) => (
  createBasicLaborRequest({
    req,
    res,
    requestType: PERMISSION_TYPE,
    successMessage: 'Solicitud de permiso creada exitosamente'
  })
);

// Crea una solicitud de incapacidad reutilizando el flujo base.
// En esta primera version se soporta el tipo general y el sub_tipo para origen o clase.
const createDisabilityRequest = async (req, res) => (
  createBasicLaborRequest({
    req,
    res,
    requestType: DISABILITY_TYPE,
    successMessage: 'Solicitud de incapacidad creada exitosamente'
  })
);

// Crea una solicitud de licencia reutilizando el flujo base.
// El detalle especifico se diferencia por medio de sub_tipo.
const createLicenseRequest = async (req, res) => (
  createBasicLaborRequest({
    req,
    res,
    requestType: LICENSE_TYPE,
    successMessage: 'Solicitud de licencia creada exitosamente'
  })
);

// Retorna el historial de solicitudes del empleado autenticado.
// Se puede filtrar opcionalmente por tipo usando query param.
const getMyRequests = async (req, res) => {
  try {
    if (!req.user?.id_empleado) {
      return res.status(403).json({
        success: false,
        message: 'Tu usuario no tiene un empleado asociado'
      });
    }

    const filters = [req.user.id_empleado];
    let typeFilterSql = '';

    if (req.query.tipo) {
      typeFilterSql = ' AND s.tipo = ?';
      filters.push(String(req.query.tipo).toUpperCase());
    }

    const [rows] = await pool.query(
      `SELECT
        s.id_solicitud,
        s.tipo,
        s.sub_tipo,
        s.fecha_inicio,
        s.fecha_fin,
        s.dias_solicitados,
        s.horas_solicitadas,
        s.es_remunerado,
        s.porcentaje_pago,
        s.origen_novedad,
        s.estado,
        s.pendiente_liquidacion,
        s.liquidada_en_nomina,
        s.fecha_liquidacion,
        s.comentario_empleado,
        s.comentario_aprobador,
        s.documento_soporte,
        s.fecha_solicitud,
        s.fecha_respuesta
      FROM solicitudes_laborales s
      WHERE s.id_empleado = ?
      ${typeFilterSql}
      ORDER BY s.fecha_solicitud DESC, s.id_solicitud DESC`,
      filters
    );

    return res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error obteniendo mis solicitudes:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo las solicitudes del empleado'
    });
  }
};

// Retorna todas las solicitudes para gestion administrativa.
// Permite filtrar por tipo, estado e id_empleado desde query params.
const getAllRequests = async (req, res) => {
  try {
    const queryParams = [];
    const whereClauses = [];

    if (req.query.tipo) {
      whereClauses.push('s.tipo = ?');
      queryParams.push(String(req.query.tipo).toUpperCase());
    }

    if (req.query.estado) {
      whereClauses.push('s.estado = ?');
      queryParams.push(String(req.query.estado).toUpperCase());
    }

    if (req.query.id_empleado) {
      whereClauses.push('s.id_empleado = ?');
      queryParams.push(Number(req.query.id_empleado));
    }

    const whereSql = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const [rows] = await pool.query(
      `SELECT
        s.id_solicitud,
        s.id_empleado,
        s.tipo,
        s.sub_tipo,
        s.fecha_inicio,
        s.fecha_fin,
        s.dias_solicitados,
        s.horas_solicitadas,
        s.es_remunerado,
        s.porcentaje_pago,
        s.origen_novedad,
        s.estado,
        s.pendiente_liquidacion,
        s.liquidada_en_nomina,
        s.fecha_liquidacion,
        s.comentario_empleado,
        s.comentario_aprobador,
        s.documento_soporte,
        s.fecha_solicitud,
        s.fecha_respuesta,
        CONCAT(e.nombres, ' ', e.apellidos) AS empleado,
        u.username AS aprobado_por_username
      FROM solicitudes_laborales s
      INNER JOIN empleados e ON e.id_empleado = s.id_empleado
      LEFT JOIN usuarios u ON u.id_usuario = s.aprobado_por
      ${whereSql}
      ORDER BY s.fecha_solicitud DESC, s.id_solicitud DESC`,
      queryParams
    );

    return res.json({
      success: true,
      data: rows,
      count: rows.length,
      filtros: {
        tipo: req.query.tipo ? String(req.query.tipo).toUpperCase() : null,
        estado: req.query.estado ? String(req.query.estado).toUpperCase() : null,
        id_empleado: req.query.id_empleado ? Number(req.query.id_empleado) : null
      }
    });
  } catch (error) {
    console.error('Error obteniendo solicitudes administrativas:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo las solicitudes'
    });
  }
};

// Reporte consolidado de novedades aprobadas y su impacto en nomina.
const getApprovedRequestsReport = async (req, res) => {
  try {
    const now = new Date();
    const requestedYear = Number(req.query.anio) || now.getUTCFullYear();
    const requestedMonth = req.query.mes ? Number(req.query.mes) : null;
    const queryParams = [];
    const whereClauses = ['s.estado = \'APROBADA\''];

    if (requestedYear >= 2000 && requestedYear <= 2100) {
      whereClauses.push('YEAR(s.fecha_inicio) = ?');
      queryParams.push(requestedYear);
    }

    if (requestedMonth && requestedMonth >= 1 && requestedMonth <= 12) {
      whereClauses.push('MONTH(s.fecha_inicio) = ?');
      queryParams.push(requestedMonth);
    }

    if (req.query.tipo) {
      whereClauses.push('s.tipo = ?');
      queryParams.push(String(req.query.tipo).toUpperCase());
    }

    if (req.query.id_empleado) {
      whereClauses.push('s.id_empleado = ?');
      queryParams.push(Number(req.query.id_empleado));
    }

    const [rows] = await pool.query(
      `SELECT
        s.id_solicitud,
        s.id_empleado,
        CONCAT(e.nombres, ' ', e.apellidos) AS empleado,
        s.tipo,
        s.sub_tipo,
        s.fecha_inicio,
        s.fecha_fin,
        s.dias_solicitados,
        s.horas_solicitadas,
        s.es_remunerado,
        s.porcentaje_pago,
        s.origen_novedad,
        s.pendiente_liquidacion,
        s.liquidada_en_nomina,
        nna.id_nomina,
        nna.categoria,
        nna.concepto,
        nna.valor_aplicado
      FROM solicitudes_laborales s
      INNER JOIN empleados e ON e.id_empleado = s.id_empleado
      LEFT JOIN nomina_novedades_aplicadas nna ON nna.id_solicitud = s.id_solicitud
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY s.fecha_inicio DESC, s.id_solicitud DESC`,
      queryParams
    );

    const resumen = rows.reduce((acc, row) => {
      if (row.categoria === 'DEVENGADO') acc.total_devengado += Number(row.valor_aplicado || 0);
      if (row.categoria === 'DEDUCCION') acc.total_deduccion += Number(row.valor_aplicado || 0);
      return acc;
    }, { total_solicitudes: rows.length, total_devengado: 0, total_deduccion: 0 });

    return res.json({
      success: true,
      data: {
        resumen: {
          ...resumen,
          total_devengado: Number(resumen.total_devengado.toFixed(2)),
          total_deduccion: Number(resumen.total_deduccion.toFixed(2))
        },
        rows
      }
    });
  } catch (error) {
    console.error('Error generando reporte de solicitudes aprobadas:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error generando el reporte de solicitudes aprobadas'
    });
  }
};

// Consulta el saldo de vacaciones para un empleado y un periodo anual.
// Un empleado solo puede consultar su propio saldo.
const getVacationBalance = async (req, res) => {
  try {
    const requestedEmployeeId = Number(req.params.id_empleado);
    const currentYear = new Date().getUTCFullYear();
    const requestedYear = Number(req.query.periodo_anio) || currentYear;

    if (!requestedEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Debes indicar un id_empleado valido'
      });
    }

    if (req.user?.rol === 'EMPLEADO' && Number(req.user.id_empleado) !== requestedEmployeeId) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes consultar tu propio saldo de vacaciones'
      });
    }

    const [rows] = await pool.query(
      `SELECT
        v.id_saldo,
        v.id_empleado,
        v.periodo_anio,
        v.dias_ganados,
        v.dias_disfrutados,
        v.dias_pendientes,
        v.actualizado_en,
        CONCAT(e.nombres, ' ', e.apellidos) AS empleado
      FROM vacaciones_saldos v
      INNER JOIN empleados e ON e.id_empleado = v.id_empleado
      WHERE v.id_empleado = ? AND v.periodo_anio = ?
      LIMIT 1`,
      [requestedEmployeeId, requestedYear]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No existe saldo de vacaciones para el empleado en el periodo ${requestedYear}`
      });
    }

    return res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error obteniendo saldo de vacaciones:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo el saldo de vacaciones'
    });
  }
};

// Aprueba una solicitud de vacaciones y descuenta el saldo del periodo.
// Solo se permite aprobar solicitudes que sigan en estado PENDIENTE.
const approveVacationRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const idSolicitud = Number(req.params.id);
    const comentarioAprobador = req.body.comentario_aprobador || null;

    if (!idSolicitud) {
      return res.status(400).json({
        success: false,
        message: 'Debes indicar un id de solicitud valido'
      });
    }

    const request = await getRequestById(idSolicitud);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    if (request.tipo !== VACATION_TYPE) {
      return res.status(400).json({
        success: false,
        message: 'Esta accion solo esta disponible para solicitudes de vacaciones'
      });
    }

    if (request.estado !== PENDING_STATUS) {
      return res.status(409).json({
        success: false,
        message: 'Solo se pueden aprobar solicitudes en estado PENDIENTE'
      });
    }

    const periodYear = new Date(request.fecha_inicio).getUTCFullYear();

    await connection.beginTransaction();

    // Se bloquea la fila del saldo para evitar aprobaciones concurrentes.
    const [balanceRows] = await connection.query(
      `SELECT
        id_saldo,
        dias_ganados,
        dias_disfrutados,
        dias_pendientes
      FROM vacaciones_saldos
      WHERE id_empleado = ? AND periodo_anio = ?
      LIMIT 1
      FOR UPDATE`,
      [request.id_empleado, periodYear]
    );

    if (balanceRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `No existe saldo de vacaciones para el periodo ${periodYear}`
      });
    }

    const balance = balanceRows[0];
    const requestedDays = Number(request.dias_solicitados) || 0;
    const pendingDays = Number(balance.dias_pendientes) || 0;

    if (pendingDays < requestedDays) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'El saldo actual no alcanza para aprobar esta solicitud'
      });
    }

    await connection.query(
      `UPDATE vacaciones_saldos
       SET dias_disfrutados = dias_disfrutados + ?,
           dias_pendientes = dias_pendientes - ?
       WHERE id_saldo = ?`,
      [requestedDays, requestedDays, balance.id_saldo]
    );

    await connection.query(
      `UPDATE solicitudes_laborales
       SET estado = 'APROBADA',
           comentario_aprobador = ?,
           fecha_respuesta = CURRENT_TIMESTAMP,
           aprobado_por = ?,
           pendiente_liquidacion = 1,
           liquidada_en_nomina = 0,
           fecha_liquidacion = NULL,
           impacto_nomina_calculado = ?
       WHERE id_solicitud = ?`,
      [
        comentarioAprobador,
        req.user.id_usuario,
        JSON.stringify(buildApprovalPayrollSnapshot({ requestRow: request })),
        idSolicitud
      ]
    );

    await connection.commit();

    const [updatedRows] = await pool.query(
      `SELECT
        s.id_solicitud,
        s.id_empleado,
        s.tipo,
        s.sub_tipo,
        s.fecha_inicio,
        s.fecha_fin,
        s.dias_solicitados,
        s.horas_solicitadas,
        s.es_remunerado,
        s.porcentaje_pago,
        s.origen_novedad,
        s.estado,
        s.pendiente_liquidacion,
        s.liquidada_en_nomina,
        s.fecha_liquidacion,
        s.comentario_empleado,
        s.comentario_aprobador,
        s.fecha_solicitud,
        s.fecha_respuesta,
        CONCAT(e.nombres, ' ', e.apellidos) AS empleado
      FROM solicitudes_laborales s
      INNER JOIN empleados e ON e.id_empleado = s.id_empleado
      WHERE s.id_solicitud = ?`,
      [idSolicitud]
    );

    return res.json({
      success: true,
      message: 'Solicitud de vacaciones aprobada exitosamente',
      data: updatedRows[0]
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error aprobando solicitud de vacaciones:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error aprobando la solicitud de vacaciones'
    });
  } finally {
    connection.release();
  }
};

// Rechaza una solicitud de vacaciones sin afectar el saldo acumulado,
// porque los dias solo se descuentan cuando la solicitud es aprobada.
const rejectVacationRequest = async (req, res) => {
  try {
    const idSolicitud = Number(req.params.id);
    const comentarioAprobador = req.body.comentario_aprobador || null;

    if (!idSolicitud) {
      return res.status(400).json({
        success: false,
        message: 'Debes indicar un id de solicitud valido'
      });
    }

    const request = await getRequestById(idSolicitud);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    if (request.tipo !== VACATION_TYPE) {
      return res.status(400).json({
        success: false,
        message: 'Esta accion solo esta disponible para solicitudes de vacaciones'
      });
    }

    if (request.estado !== PENDING_STATUS) {
      return res.status(409).json({
        success: false,
        message: 'Solo se pueden rechazar solicitudes en estado PENDIENTE'
      });
    }

    await pool.query(
      `UPDATE solicitudes_laborales
       SET estado = 'RECHAZADA',
           comentario_aprobador = ?,
           fecha_respuesta = CURRENT_TIMESTAMP,
           aprobado_por = ?,
           pendiente_liquidacion = 0,
           liquidada_en_nomina = 0,
           fecha_liquidacion = NULL,
           impacto_nomina_calculado = NULL
       WHERE id_solicitud = ?`,
      [comentarioAprobador, req.user.id_usuario, idSolicitud]
    );

    const [updatedRows] = await pool.query(
      `SELECT
        s.id_solicitud,
        s.id_empleado,
        s.tipo,
        s.sub_tipo,
        s.fecha_inicio,
        s.fecha_fin,
        s.dias_solicitados,
        s.horas_solicitadas,
        s.es_remunerado,
        s.porcentaje_pago,
        s.origen_novedad,
        s.estado,
        s.pendiente_liquidacion,
        s.liquidada_en_nomina,
        s.fecha_liquidacion,
        s.comentario_empleado,
        s.comentario_aprobador,
        s.fecha_solicitud,
        s.fecha_respuesta,
        CONCAT(e.nombres, ' ', e.apellidos) AS empleado
      FROM solicitudes_laborales s
      INNER JOIN empleados e ON e.id_empleado = s.id_empleado
      WHERE s.id_solicitud = ?`,
      [idSolicitud]
    );

    return res.json({
      success: true,
      message: 'Solicitud de vacaciones rechazada exitosamente',
      data: updatedRows[0]
    });
  } catch (error) {
    console.error('Error rechazando solicitud de vacaciones:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error rechazando la solicitud de vacaciones'
    });
  }
};

// Aprueba una solicitud de permiso sin tocar saldos.
const approvePermissionRequest = async (req, res) => (
  updateBasicRequestStatus({
    req,
    res,
    expectedType: PERMISSION_TYPE,
    expectedCurrentStatuses: [PENDING_STATUS],
    nextStatus: 'APROBADA',
    successMessage: 'Solicitud de permiso aprobada exitosamente'
  })
);

// Rechaza una solicitud de permiso sin tocar saldos.
const rejectPermissionRequest = async (req, res) => (
  updateBasicRequestStatus({
    req,
    res,
    expectedType: PERMISSION_TYPE,
    expectedCurrentStatuses: [PENDING_STATUS],
    nextStatus: 'RECHAZADA',
    successMessage: 'Solicitud de permiso rechazada exitosamente'
  })
);

// Aprueba una solicitud de incapacidad sin tocar saldos.
const approveDisabilityRequest = async (req, res) => (
  updateBasicRequestStatus({
    req,
    res,
    expectedType: DISABILITY_TYPE,
    expectedCurrentStatuses: [PENDING_STATUS],
    nextStatus: 'APROBADA',
    successMessage: 'Solicitud de incapacidad aprobada exitosamente'
  })
);

// Rechaza una solicitud de incapacidad sin tocar saldos.
const rejectDisabilityRequest = async (req, res) => (
  updateBasicRequestStatus({
    req,
    res,
    expectedType: DISABILITY_TYPE,
    expectedCurrentStatuses: [PENDING_STATUS],
    nextStatus: 'RECHAZADA',
    successMessage: 'Solicitud de incapacidad rechazada exitosamente'
  })
);

// Aprueba una solicitud de licencia sin tocar saldos.
const approveLicenseRequest = async (req, res) => (
  updateBasicRequestStatus({
    req,
    res,
    expectedType: LICENSE_TYPE,
    expectedCurrentStatuses: [PENDING_STATUS],
    nextStatus: 'APROBADA',
    successMessage: 'Solicitud de licencia aprobada exitosamente'
  })
);

// Rechaza una solicitud de licencia sin tocar saldos.
const rejectLicenseRequest = async (req, res) => (
  updateBasicRequestStatus({
    req,
    res,
    expectedType: LICENSE_TYPE,
    expectedCurrentStatuses: [PENDING_STATUS],
    nextStatus: 'RECHAZADA',
    successMessage: 'Solicitud de licencia rechazada exitosamente'
  })
);

// Cancela una solicitud de vacaciones.
// Si la solicitud ya estaba aprobada, se devuelven los dias al saldo.
// Si estaba pendiente, solo cambia el estado a CANCELADA.
const cancelVacationRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const idSolicitud = Number(req.params.id);
    const comentarioAprobador = req.body.comentario_aprobador || req.body.comentario_cancelacion || null;

    if (!idSolicitud) {
      return res.status(400).json({
        success: false,
        message: 'Debes indicar un id de solicitud valido'
      });
    }

    const request = await getRequestById(idSolicitud);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    if (request.tipo !== VACATION_TYPE) {
      return res.status(400).json({
        success: false,
        message: 'Esta accion solo esta disponible para solicitudes de vacaciones'
      });
    }

    if (!VISIBLE_REQUEST_STATUSES.includes(request.estado)) {
      return res.status(409).json({
        success: false,
        message: 'Solo se pueden cancelar solicitudes en estado PENDIENTE o APROBADA'
      });
    }

    await connection.beginTransaction();

    // Si la solicitud estaba aprobada, el saldo se recompone antes de cancelar.
    if (request.estado === 'APROBADA') {
      const periodYear = new Date(request.fecha_inicio).getUTCFullYear();

      const [balanceRows] = await connection.query(
        `SELECT
          id_saldo,
          dias_disfrutados,
          dias_pendientes
        FROM vacaciones_saldos
        WHERE id_empleado = ? AND periodo_anio = ?
        LIMIT 1
        FOR UPDATE`,
        [request.id_empleado, periodYear]
      );

      if (balanceRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `No existe saldo de vacaciones para el periodo ${periodYear}`
        });
      }

      const balance = balanceRows[0];
      const requestedDays = Number(request.dias_solicitados) || 0;
      const enjoyedDays = Number(balance.dias_disfrutados) || 0;

      if (enjoyedDays < requestedDays) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'El saldo actual es inconsistente y no permite cancelar la solicitud'
        });
      }

      await connection.query(
        `UPDATE vacaciones_saldos
         SET dias_disfrutados = dias_disfrutados - ?,
             dias_pendientes = dias_pendientes + ?
         WHERE id_saldo = ?`,
        [requestedDays, requestedDays, balance.id_saldo]
      );
    }

    await connection.query(
      `UPDATE solicitudes_laborales
       SET estado = 'CANCELADA',
           comentario_aprobador = ?,
           fecha_respuesta = CURRENT_TIMESTAMP,
           aprobado_por = ?,
           pendiente_liquidacion = 0,
           liquidada_en_nomina = 0,
           fecha_liquidacion = NULL,
           impacto_nomina_calculado = NULL
       WHERE id_solicitud = ?`,
      [comentarioAprobador, req.user.id_usuario, idSolicitud]
    );

    await connection.commit();

    const [updatedRows] = await pool.query(
      `SELECT
        s.id_solicitud,
        s.id_empleado,
        s.tipo,
        s.sub_tipo,
        s.fecha_inicio,
        s.fecha_fin,
        s.dias_solicitados,
        s.horas_solicitadas,
        s.es_remunerado,
        s.porcentaje_pago,
        s.origen_novedad,
        s.estado,
        s.pendiente_liquidacion,
        s.liquidada_en_nomina,
        s.fecha_liquidacion,
        s.comentario_empleado,
        s.comentario_aprobador,
        s.fecha_solicitud,
        s.fecha_respuesta,
        CONCAT(e.nombres, ' ', e.apellidos) AS empleado
      FROM solicitudes_laborales s
      INNER JOIN empleados e ON e.id_empleado = s.id_empleado
      WHERE s.id_solicitud = ?`,
      [idSolicitud]
    );

    return res.json({
      success: true,
      message: 'Solicitud de vacaciones cancelada exitosamente',
      data: updatedRows[0]
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error cancelando solicitud de vacaciones:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error cancelando la solicitud de vacaciones'
    });
  } finally {
    connection.release();
  }
};

// Cancela una solicitud de permiso si esta pendiente o aprobada.
const cancelPermissionRequest = async (req, res) => (
  updateBasicRequestStatus({
    req,
    res,
    expectedType: PERMISSION_TYPE,
    expectedCurrentStatuses: ['PENDIENTE', 'APROBADA'],
    nextStatus: 'CANCELADA',
    successMessage: 'Solicitud de permiso cancelada exitosamente'
  })
);

// Cancela una solicitud de incapacidad si esta pendiente o aprobada.
const cancelDisabilityRequest = async (req, res) => (
  updateBasicRequestStatus({
    req,
    res,
    expectedType: DISABILITY_TYPE,
    expectedCurrentStatuses: ['PENDIENTE', 'APROBADA'],
    nextStatus: 'CANCELADA',
    successMessage: 'Solicitud de incapacidad cancelada exitosamente'
  })
);

// Cancela una solicitud de licencia si esta pendiente o aprobada.
const cancelLicenseRequest = async (req, res) => (
  updateBasicRequestStatus({
    req,
    res,
    expectedType: LICENSE_TYPE,
    expectedCurrentStatuses: ['PENDIENTE', 'APROBADA'],
    nextStatus: 'CANCELADA',
    successMessage: 'Solicitud de licencia cancelada exitosamente'
  })
);

module.exports = {
  createVacationRequest,
  createPermissionRequest,
  createDisabilityRequest,
  createLicenseRequest,
  getMyRequests,
  getAllRequests,
  getApprovedRequestsReport,
  getVacationBalance,
  approveVacationRequest,
  rejectVacationRequest,
  cancelVacationRequest,
  approvePermissionRequest,
  rejectPermissionRequest,
  cancelPermissionRequest,
  approveDisabilityRequest,
  rejectDisabilityRequest,
  cancelDisabilityRequest,
  approveLicenseRequest,
  rejectLicenseRequest,
  cancelLicenseRequest
};
