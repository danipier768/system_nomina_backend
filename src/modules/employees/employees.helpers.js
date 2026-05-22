const { pool } = require("../../config/database.js");
const {
  DEFAULT_EMPLOYEES_PAGE,
  DEFAULT_EMPLOYEES_LIMIT,
} = require("./employees.constants");

// Resuelve el cargo por nombre. Si no existe, lo crea y devuelve su id.
const resolveCargoIdByName = async (nombreCargo, connection = pool) => {
  const cargoLimpio = nombreCargo?.trim();

  if (!cargoLimpio) return null;

  const [existingCargo] = await connection.query(
    `SELECT id_cargo FROM cargos WHERE UPPER(nombre_cargo) = UPPER(?) LIMIT 1`,
    [cargoLimpio]
  );

  if (existingCargo.length > 0) {
    return existingCargo[0].id_cargo;
  }

  const [result] = await connection.query(
    `INSERT INTO cargos (nombre_cargo) VALUES (?)`,
    [cargoLimpio]
  );

  return result.insertId;
};

// Identifica si el usuario autenticado pertenece al rol de empleado.
const isEmployeeUser = (user) => user?.rol === "EMPLEADO";

// Valida que un usuario empleado tenga un id_empleado asociado.
const validateEmployeeScopeAccess = (user) => {
  if (isEmployeeUser(user) && !user?.id_empleado) {
    return {
      allowed: false,
      status: 403,
      message: "No tienes un empleado asociado para consultar informacion",
    };
  }

  return { allowed: true };
};

// Convierte los parametros de paginacion a numeros usables.
const buildPagination = (query) => {
  const page = parseInt(query.page, 10) || DEFAULT_EMPLOYEES_PAGE;
  const limit = parseInt(query.limit, 10) || DEFAULT_EMPLOYEES_LIMIT;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

module.exports = {
  resolveCargoIdByName,
  isEmployeeUser,
  validateEmployeeScopeAccess,
  buildPagination,
};
