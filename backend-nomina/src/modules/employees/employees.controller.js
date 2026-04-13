const { pool } = require("../../config/database.js");
const {
  EMPLOYEE_SEARCH_LIMIT,
  DEFAULT_VACATION_DAYS,
} = require("./employees.constants");
const {
  resolveCargoIdByName,
  isEmployeeUser,
  validateEmployeeScopeAccess,
  buildPagination,
} = require("./employees.helpers");
const {
  validateName,
  validateIdentificationNumber,
  validateNumericField,
  validateDate,
  validateMinimumAge,
} = require("../../utils/validators");

// Lista empleados con paginacion y relaciones basicas.
const getAllEmployees = async (req, res) => {
  try {
    const isEmployeeRole = isEmployeeUser(req.user);
    const accessValidation = validateEmployeeScopeAccess(req.user);

    if (!accessValidation.allowed) {
      return res.status(accessValidation.status).json({
        success: false,
        message: accessValidation.message,
      });
    }

    const { page, limit, offset } = buildPagination(req.query);
    const includeInactive = req.query.includeInactive === 'true';

    const [countResult] = isEmployeeRole
      ? await pool.query(
          `SELECT COUNT(*) as total FROM empleados WHERE id_empleado = ? AND activo = TRUE`,
          [req.user.id_empleado]
        )
      : await pool.query(`SELECT COUNT(*) as total FROM empleados WHERE ${includeInactive ? '1=1' : 'activo = TRUE'}`);

    const total = countResult[0].total;

    const employeesQuery = `SELECT 
        e.id_empleado,
        e.nombres,
        e.apellidos,
        e.tipo_identificacion,
        e.numero_identificacion,
        e.sueldo,
        e.fecha_nacimiento,
        e.fecha_ingreso,
        e.activo,
        c.nombre_cargo,
        d.nombre_departamento,
        u.username,
        u.email,
        vs.dias_ganados,
        vs.dias_disfrutados,
        vs.dias_pendientes,
        vs.periodo_anio
      FROM empleados e
      LEFT JOIN cargos c ON e.id_cargo = c.id_cargo
      LEFT JOIN departamentos d ON e.id_departamento = d.id_departamento
      LEFT JOIN usuarios u ON u.id_empleado = e.id_empleado
      LEFT JOIN vacaciones_saldos vs ON e.id_empleado = vs.id_empleado AND vs.periodo_anio = YEAR(CURDATE())
      WHERE ${includeInactive ? '1=1' : 'e.activo = TRUE'} ${isEmployeeRole ? "AND e.id_empleado = ?" : ""}
      ORDER BY e.apellidos, e.nombres
      LIMIT ? OFFSET ?`;

    const queryParams = isEmployeeRole
      ? [req.user.id_empleado, limit, offset]
      : [limit, offset];

    const [employees] = await pool.query(employeesQuery, queryParams);

    res.json({
      success: true,
      succes: true,
      data: employees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error en getAllEmployees:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener empleados",
    });
  }
};

// Obtiene un empleado por id con sus relaciones principales.
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const isEmployeeRole = isEmployeeUser(req.user);
    const accessValidation = validateEmployeeScopeAccess(req.user);

    if (!accessValidation.allowed) {
      return res.status(accessValidation.status).json({
        success: false,
        message: accessValidation.message,
      });
    }

    if (isEmployeeRole && Number(id) !== Number(req.user.id_empleado)) {
      return res.status(403).json({
        success: false,
        message: "Solo puedes consultar tu informacion de empleado",
      });
    }

    // Si es empleado regular, solo puede ver su info si está activo
    // Si es admin/rrhh, puede ver empleados activos e inactivos
    const whereClause = isEmployeeRole ? "WHERE e.id_empleado = ? AND e.activo = TRUE" : "WHERE e.id_empleado = ?";

    const [employees] = await pool.query(
      `SELECT 
        e.*,
        c.nombre_cargo,
        d.nombre_departamento,
        u.username,
        u.email,
        u.id_usuario,
        vs.dias_ganados,
        vs.dias_disfrutados,
        vs.dias_pendientes,
        vs.periodo_anio
      FROM empleados e
      LEFT JOIN cargos c ON e.id_cargo = c.id_cargo
      LEFT JOIN departamentos d ON e.id_departamento = d.id_departamento
      LEFT JOIN usuarios u ON u.id_empleado = e.id_empleado
      LEFT JOIN vacaciones_saldos vs ON e.id_empleado = vs.id_empleado AND vs.periodo_anio = YEAR(CURDATE())
      ${whereClause}`,
      [id]
    );

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Empleado no encontrado",
      });
    }

    res.json({
      success: true,
      data: employees[0],
    });
  } catch (error) {
    console.error("Error en getEmployeeById:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener empleado",
    });
  }
};

// Crea un empleado y deja listo su saldo inicial de vacaciones del anio actual.
const createEmployee = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      nombres,
      apellidos,
      tipo_identificacion,
      numero_identificacion,
      sueldo,
      fecha_nacimiento,
      fecha_ingreso,
      nombre_cargo,
      id_departamento,
    } = req.body;

    // Validación de campos requeridos
    if (
      !nombres ||
      !apellidos ||
      !tipo_identificacion ||
      !numero_identificacion ||
      sueldo === undefined ||
      sueldo === null ||
      sueldo === "" ||
      !nombre_cargo?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Por favor completa todos los campos requeridos",
      });
    }

    // Validar nombres
    const nombresValidation = validateName(nombres);
    if (!nombresValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: `Nombres: ${nombresValidation.error}`,
      });
    }

    // Validar apellidos
    const apellidosValidation = validateName(apellidos);
    if (!apellidosValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: `Apellidos: ${apellidosValidation.error}`,
      });
    }

    // Validar número de identificación
    const idValidation = validateIdentificationNumber(numero_identificacion);
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: `Número de identificación: ${idValidation.error}`,
      });
    }

    // Validar salario
    const salaryValidation = validateNumericField(sueldo, 0);
    if (!salaryValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: `Salario: ${salaryValidation.error}`,
      });
    }

    // Validar nombre de cargo
    const cargoValidation = validateName(nombre_cargo);
    if (!cargoValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: `Nombre de cargo: ${cargoValidation.error}`,
      });
    }

    // Validar fecha de nacimiento si se proporciona
    if (fecha_nacimiento) {
      const birthDateValidation = validateDate(fecha_nacimiento);
      if (!birthDateValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: `Fecha de nacimiento: ${birthDateValidation.error}`,
        });
      }

      const ageValidation = validateMinimumAge(fecha_nacimiento, 18);
      if (!ageValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: `Fecha de nacimiento: ${ageValidation.error}`,
        });
      }
    }

    // Validar fecha de ingreso si se proporciona
    if (fecha_ingreso) {
      const ingressDateValidation = validateDate(fecha_ingreso);
      if (!ingressDateValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: `Fecha de ingreso: ${ingressDateValidation.error}`,
        });
      }
    }

    const [existing] = await connection.query(
      `SELECT id_empleado FROM empleados WHERE numero_identificacion = ?`,
      [numero_identificacion]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Ya existe un empleado con ese numero de identificacion",
      });
    }

    const resolvedCargoId = await resolveCargoIdByName(nombre_cargo, connection);
    const currentYear = new Date().getUTCFullYear();

    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO empleados 
        (nombres, apellidos, tipo_identificacion, numero_identificacion, sueldo,
         fecha_nacimiento, fecha_ingreso, id_cargo, id_departamento) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombres,
        apellidos,
        tipo_identificacion,
        numero_identificacion,
        sueldo,
        fecha_nacimiento || null,
        fecha_ingreso || new Date(),
        resolvedCargoId,
        id_departamento,
      ]
    );

    await connection.query(
      `INSERT INTO vacaciones_saldos
        (id_empleado, periodo_anio, dias_ganados, dias_disfrutados, dias_pendientes)
       VALUES (?, ?, ?, ?, ?)`,
      [result.insertId, currentYear, DEFAULT_VACATION_DAYS, 0, DEFAULT_VACATION_DAYS]
    );

    await connection.commit();

    const [newEmployee] = await connection.query(
      `SELECT 
        e.*,
        c.nombre_cargo,
        d.nombre_departamento,
        vs.dias_ganados,
        vs.dias_disfrutados,
        vs.dias_pendientes,
        vs.periodo_anio
      FROM empleados e
      LEFT JOIN cargos c ON e.id_cargo = c.id_cargo
      LEFT JOIN departamentos d ON e.id_departamento = d.id_departamento
      LEFT JOIN vacaciones_saldos vs ON e.id_empleado = vs.id_empleado AND vs.periodo_anio = YEAR(CURDATE())
      WHERE e.id_empleado = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Empleado creado exitosamente",
      data: newEmployee[0],
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error en createEmployee:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear empleado",
    });
  } finally {
    connection.release();
  }
};

// Actualiza un empleado conservando valores anteriores si no llegan en el body.
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombres,
      apellidos,
      tipo_identificacion,
      numero_identificacion,
      sueldo,
      fecha_nacimiento,
      fecha_ingreso,
      nombre_cargo,
      id_departamento,
    } = req.body;

    const [existing] = await pool.query(
      `SELECT id_empleado FROM empleados WHERE id_empleado = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Empleado no encontrado",
      });
    }

    if (numero_identificacion) {
      const [duplicate] = await pool.query(
        `SELECT numero_identificacion FROM empleados WHERE numero_identificacion = ? AND id_empleado != ?`,
        [numero_identificacion, id]
      );

      if (duplicate.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Ya existe otro empleado con ese numero de identificacion",
        });
      }
    }

    const resolvedCargoId =
      nombre_cargo !== undefined
        ? await resolveCargoIdByName(nombre_cargo)
        : undefined;

    await pool.query(
      `UPDATE empleados 
        SET nombres = COALESCE(?, nombres),
            apellidos = COALESCE(?, apellidos),
            tipo_identificacion = COALESCE(?, tipo_identificacion),
            numero_identificacion = COALESCE(?, numero_identificacion),
            sueldo = COALESCE(?, sueldo),
            fecha_nacimiento = COALESCE(?, fecha_nacimiento),
            fecha_ingreso = COALESCE(?, fecha_ingreso),
            id_cargo = COALESCE(?, id_cargo),
            id_departamento = COALESCE(?, id_departamento)
        WHERE id_empleado = ?`,
      [
        nombres,
        apellidos,
        tipo_identificacion,
        numero_identificacion,
        sueldo,
        fecha_nacimiento,
        fecha_ingreso,
        resolvedCargoId,
        id_departamento,
        id,
      ]
    );

    const [updated] = await pool.query(
      `SELECT 
        e.*,
        c.nombre_cargo,
        d.nombre_departamento,
        vs.dias_ganados,
        vs.dias_disfrutados,
        vs.dias_pendientes,
        vs.periodo_anio
      FROM empleados e
      LEFT JOIN cargos c ON e.id_cargo = c.id_cargo
      LEFT JOIN departamentos d ON e.id_departamento = d.id_departamento
      LEFT JOIN vacaciones_saldos vs ON e.id_empleado = vs.id_empleado AND vs.periodo_anio = YEAR(CURDATE())
      WHERE e.id_empleado = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Empleado actualizado exitosamente",
      data: updated[0],
    });
  } catch (error) {
    console.error("Error en updateEmployee:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar empleado",
    });
  }
};

// Desactiva (soft delete) o elimina (hard delete) un empleado según permisos
// ADMINISTRADOR: puede hacer ambos
// RRHH: solo puede desactivar
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query; // ?permanent=true para eliminación permanente
    const userRole = req.user.rol;

    // Verificar si el empleado existe
    const [existing] = await pool.query(
      "SELECT id_empleado, activo FROM empleados WHERE id_empleado = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Empleado no encontrado",
      });
    }

    // Si ya está inactivo y no es eliminación permanente
    if (!existing[0].activo && !permanent) {
      return res.status(400).json({
        success: false,
        message: "El empleado ya está desactivado",
      });
    }

    // ELIMINACIÓN PERMANENTE (Hard Delete) - Solo ADMINISTRADOR
    if (permanent === 'true') {
      if (userRole !== 'ADMINISTRADOR') {
        return res.status(403).json({
          success: false,
          message: "Solo los administradores pueden eliminar permanentemente empleados",
        });
      }

      // Verificar que no tenga usuario o nómina asociados
      const [hasUser] = await pool.query(
        "SELECT id_usuario FROM usuarios WHERE id_empleado = ?",
        [id]
      );

      if (hasUser.length > 0) {
        return res.status(409).json({
          success: false,
          message: "No se puede eliminar. El empleado tiene un usuario asociado. Elimine o reasigne el usuario primero",
        });
      }

      const [hasNomina] = await pool.query(
        "SELECT id_nomina FROM nomina WHERE id_empleado = ?",
        [id]
      );

      if (hasNomina.length > 0) {
        return res.status(409).json({
          success: false,
          message: "No se puede eliminar. El empleado tiene registros de nómina. Archívelos primero",
        });
      }

      // Eliminar relacionados
      await pool.query("DELETE FROM vacaciones_saldos WHERE id_empleado = ?", [id]);
      await pool.query("DELETE FROM empleados WHERE id_empleado = ?", [id]);

      return res.json({
        success: true,
        message: "Empleado eliminado permanentemente del sistema",
        type: 'hard_delete',
      });
    }

    // DESACTIVACIÓN (Soft Delete) - ADMINISTRADOR o RRHH
    if (userRole !== 'ADMINISTRADOR' && userRole !== 'RRHH') {
      return res.status(403).json({
        success: false,
        message: "No tiene permiso para desactivar empleados",
      });
    }

    // Desactivar empleado
    await pool.query(
      "UPDATE empleados SET activo = FALSE, eliminado_en = NOW() WHERE id_empleado = ?",
      [id]
    );

    // Si tiene usuario asociado, también desactivarlo
    await pool.query(
      "UPDATE usuarios SET activo = FALSE WHERE id_empleado = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Empleado desactivado exitosamente. Sus datos se conservan en el sistema",
      type: 'soft_delete',
      userRole,
    });
  } catch (error) {
    console.error("Error en deleteEmployee:", error);
    res.status(500).json({
      success: false,
      message: "Error al procesar la solicitud",
    });
  }
};

// Reactiva un empleado desactivado
const reactivateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.rol;

    // Verificar permisos
    if (userRole !== 'ADMINISTRADOR' && userRole !== 'RRHH') {
      return res.status(403).json({
        success: false,
        message: "No tiene permiso para reactivar empleados",
      });
    }

    // Verificar si el empleado existe
    const [existing] = await pool.query(
      "SELECT id_empleado, activo FROM empleados WHERE id_empleado = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Empleado no encontrado",
      });
    }

    // Si ya está activo
    if (existing[0].activo) {
      return res.status(400).json({
        success: false,
        message: "El empleado ya está activo",
      });
    }

    // Reactivar empleado
    await pool.query(
      "UPDATE empleados SET activo = TRUE, eliminado_en = NULL WHERE id_empleado = ?",
      [id]
    );

    // Si tiene usuario asociado, también reactivarlo
    await pool.query(
      "UPDATE usuarios SET activo = TRUE WHERE id_empleado = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Empleado reactivado exitosamente",
      userRole,
    });
  } catch (error) {
    console.error("Error en reactivateEmployee:", error);
    res.status(500).json({
      success: false,
      message: "Error al reactivar empleado",
    });
  }
};

// Busca empleados por nombre, apellido o identificacion.
const searchEmployees = async (req, res) => {
  try {
    const { q } = req.query;
    const isEmployeeRole = isEmployeeUser(req.user);
    const accessValidation = validateEmployeeScopeAccess(req.user);

    if (!accessValidation.allowed) {
      return res.status(accessValidation.status).json({
        success: false,
        message: accessValidation.message,
      });
    }

    if (!q || q.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Por favor proporciona un termino de busqueda",
      });
    }

    const searchTerm = `%${q}%`;

    const [employees] = await pool.query(
      `SELECT 
        e.id_empleado,
        e.nombres,
        e.apellidos,
        e.numero_identificacion,
        e.sueldo,
        c.nombre_cargo,
        d.nombre_departamento,
        vs.dias_ganados,
        vs.dias_disfrutados,
        vs.dias_pendientes,
        vs.periodo_anio
      FROM empleados e
      LEFT JOIN cargos c ON e.id_cargo = c.id_cargo
      LEFT JOIN departamentos d ON e.id_departamento = d.id_departamento
      LEFT JOIN vacaciones_saldos vs ON e.id_empleado = vs.id_empleado AND vs.periodo_anio = YEAR(CURDATE())
      WHERE e.activo = TRUE AND (e.nombres LIKE ? OR e.apellidos LIKE ? OR e.numero_identificacion LIKE ?)
        ${isEmployeeRole ? "AND e.id_empleado = ?" : ""}
      ORDER BY e.apellidos, e.nombres
      LIMIT ?`,
      isEmployeeRole
        ? [searchTerm, searchTerm, searchTerm, req.user.id_empleado, EMPLOYEE_SEARCH_LIMIT]
        : [searchTerm, searchTerm, searchTerm, EMPLOYEE_SEARCH_LIMIT]
    );

    res.json({
      success: true,
      data: employees,
      count: employees.length,
    });
  } catch (error) {
    console.error("Error en searchEmployees:", error);
    res.status(500).json({
      success: false,
      message: "Error al buscar empleados",
    });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  reactivateEmployee,
  searchEmployees,
};
