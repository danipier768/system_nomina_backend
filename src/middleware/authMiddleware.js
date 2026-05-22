const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

// Verifica el JWT, consulta el usuario y adjunta su contexto a req.user.
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No se proporciono token de autenticacion",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token invalido",
      });
    }

    const decode = jwt.verify(token, process.env.JWT_SECRET);

    const [users] = await pool.query(
      `SELECT u.id_usuario, u.username, u.email, u.activo, u.id_empleado, r.nombre_rol
         FROM usuarios u
         INNER JOIN roles r ON u.id_rol = r.id_rol
         WHERE u.id_usuario = ?`,
      [decode.id_usuario]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const user = users[0];

    if (!user.activo) {
      return res.status(403).json({
        success: false,
        message: "Usuario inactivo. Contacta con el administrador",
      });
    }

    req.user = {
      id_usuario: user.id_usuario,
      username: user.username,
      email: user.email,
      rol: user.nombre_rol,
      id_empleado: user.id_empleado,
    };

    next();
  } catch (error) {
    console.error("Error en verifyToken:", error.message);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token invalido",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expirado. Por favor inicia sesion nuevamente",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error al verificar token",
    });
  }
};

// Verifica que el usuario autenticado tenga uno de los roles permitidos.
const verifyRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      });
    }

    const hasPermission = allowedRoles.includes(req.user.rol);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para realizar esta accion",
        requiredRoles: allowedRoles,
        yourRole: req.user.rol,
      });
    }

    next();
  };
};

// Middleware especifico para operaciones de Admin y RRHH.
const verifyAdminORRRHH = verifyRoles("ADMINISTRADOR", "RRHH");

// Middleware especifico para administradores.
const verifyAdmin = verifyRoles("ADMINISTRADOR");

module.exports = {
  verifyToken,
  verifyRoles,
  verifyAdminORRRHH,
  verifyAdmin,
};
