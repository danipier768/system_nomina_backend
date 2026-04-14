const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool, queryWithRetry } = require("../../config/database.js");
const { sendPasswordResetEmail } = require("../../services/emailService");
const {
  PASSWORD_MIN_LENGTH,
  JWT_EXPIRES_IN,
} = require("./auth.constants");
const {
  isValidEmail,
  generatePasswordResetToken,
  buildPasswordResetExpiration,
} = require("./auth.helpers");
const {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateLoginInput,
  validateResetToken,
} = require("../../utils/validators");

// Inicia sesion y devuelve el token JWT junto con el usuario autenticado.
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar inputs
    const loginValidation = validateLoginInput(username, password);
    if (!loginValidation.isValid) {
      return res.status(400).json({
        success: false,
        succes: false,
        message: loginValidation.error,
      });
    }

    const [users] = await queryWithRetry(
      `SELECT u.id_usuario, u.username, u.password, u.email, u.activo,
              r.nombre_rol, u.id_empleado
        FROM usuarios u
        INNER JOIN roles r ON u.id_rol = r.id_rol
        WHERE u.username = ?`,
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        succes: false,
        message: "Usuario o contrasena incorrectos",
      });
    }

    const user = users[0];
    console.log(password); // la que escribes
console.log(user.password); // la de la BD

    if (!user.activo) {
      return res.status(403).json({
        success: false,
        succes: false,
        message: "Tu cuenta esta desactivada contacta con el administrador",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        succes: false,
        message: "Usuario o contrasena incorrectos",
      });
    }

    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        username: user.username,
        rol: user.nombre_rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      succes: true,
      message: "Login exitoso",
      token,
      user: {
        id_usuario: user.id_usuario,
        username: user.username,
        email: user.email,
        rol: user.nombre_rol,
        id_empleado: user.id_empleado,
      },
    });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({
      success: false,
      succes: false,
      message: `Error al iniciar sesion => ${err}`,
    });
  }
};

// Registra usuarios nuevos para administracion del sistema.
const register = async (req, res) => {
  try {
    const { username, password, email, rol, id_empleado } = req.body;

    if (!username || !password || !email || !rol) {
      return res.status(400).json({
        success: false,
        succes: false,
        message: "Por favor completa todos los datos requeridos",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        succes: false,
        message: "Email invalido",
      });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        success: false,
        succes: false,
        message: `La contrasena debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
      });
    }

    const [existingUsers] = await pool.query(
      `SELECT id_usuario FROM usuarios WHERE username = ? OR email = ?`,
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        succes: false,
        message: "El usuario o el email ya existe",
      });
    }

    const [roles] = await pool.query(
      `SELECT id_rol FROM roles WHERE nombre_rol = ?`,
      [rol]
    );

    if (roles.length === 0) {
      return res.status(400).json({
        success: false,
        succes: false,
        message: "Rol invalido",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO usuarios (username, password, email, id_rol, id_empleado, activo)
          VALUES(?,?,?,?,?, TRUE)`,
      [username, hashedPassword, email, roles[0].id_rol, id_empleado || null]
    );

    res.status(201).json({
      success: true,
      succes: true,
      message: "Usuario registrado correctamente",
      user: {
        id_usuario: result.insertId,
        username,
        email,
        rol,
      },
    });
  } catch (error) {
    console.error("Error al registrar:", error);
    res.status(500).json({
      success: false,
      succes: false,
      message: "Error al registrar usuario",
    });
  }
};

// Genera y envia un token de recuperacion si el email existe y esta activo.
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Por favor proporciona tu email",
      });
    }

    // Validar formato de email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: `Email: ${emailValidation.error}`,
      });
    }

    const [users] = await pool.query(
      `SELECT id_usuario, username, email FROM usuarios WHERE email = ? AND activo = TRUE`,
      [email]
    );

    if (users.length === 0) {
      return res.json({
        success: true,
        message: "Si el email existe, recibiras instrucciones para recuperar tu contrasena",
      });
    }

    const user = users[0];
    const resetToken = generatePasswordResetToken();
    const expiresAt = buildPasswordResetExpiration();

    await pool.query(
      `INSERT INTO password_reset_tokens (id_usuario, token, expira_en)
       VALUES (?, ?, ?)`,
      [user.id_usuario, resetToken, expiresAt]
    );

    const emailResult = await sendPasswordResetEmail(
      user.email,
      user.username,
      resetToken
    );

    if (emailResult.success) {
      console.log("Email enviado exitosamente a:", user.email);
    } else {
      console.error("Error al enviar email:", emailResult.error);
    }

    res.json({
      success: true,
      message: "Si el email existe, recibiras instrucciones para recuperar tu contrasena",
      ...(process.env.NODE_ENV === "development" && {
        dev: {
          token: resetToken,
          username: user.username,
          emailSent: emailResult.success,
        },
      }),
    });
  } catch (error) {
    console.error("Error en requestPasswordReset:", error);
    res.status(500).json({
      success: false,
      message: "Error al procesar la solicitud",
    });
  }
};

// Restablece la contrasena usando un token valido y sin expirar.
const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword, confirmPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        succes: false,
        message: "Por favor completa todos los campos",
      });
    }

    // Validar formato de email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        success: false,
        succes: false,
        message: `Email: ${emailValidation.error}`,
      });
    }

    // Validar token
    const tokenValidation = validateResetToken(token);
    if (!tokenValidation.isValid) {
      return res.status(400).json({
        success: false,
        succes: false,
        message: tokenValidation.error,
      });
    }

    // Validar nueva contraseña
    const newPasswordValidation = validatePassword(newPassword);
    if (!newPasswordValidation.isValid) {
      return res.status(400).json({
        success: false,
        succes: false,
        message: `Contraseña: ${newPasswordValidation.error}`,
      });
    }

    // Validar que las contraseñas coincidan si se proporciona confirmPassword
    if (confirmPassword !== undefined) {
      const matchValidation = validatePasswordMatch(newPassword, confirmPassword);
      if (!matchValidation.isValid) {
        return res.status(400).json({
          success: false,
          succes: false,
          message: `Contraseña: ${matchValidation.error}`,
        });
      }
    }

    const [users] = await pool.query(
      `SELECT id_usuario FROM usuarios WHERE email = ? AND activo = TRUE`,
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        succes: false,
        message: "Usuario no encontrado",
      });
    }

    const userId = users[0].id_usuario;

    const [tokens] = await pool.query(
      `SELECT id, expira_en, usado
        FROM password_reset_tokens
        WHERE id_usuario = ? AND token = ?
        ORDER BY creado_en DESC
        LIMIT 1`,
      [userId, token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({
        success: false,
        succes: false,
        message: "Token invalido",
      });
    }

    const resetToken = tokens[0];

    if (resetToken.usado) {
      return res.status(400).json({
        success: false,
        message: "Este token ya fue utilizado",
      });
    }

    if (new Date() > new Date(resetToken.expira_en)) {
      return res.status(400).json({
        success: false,
        message: "El token ha expirado. Solicita uno nuevo",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(`UPDATE usuarios SET password = ? WHERE id_usuario = ?`, [
      hashedPassword,
      userId,
    ]);

    await pool.query(
      `UPDATE password_reset_tokens SET usado = TRUE WHERE id = ?`,
      [resetToken.id]
    );

    res.json({
      success: true,
      succes: true,
      message: "Contrasena actualizada exitosamente",
    });
  } catch (error) {
    console.error("Error en resetPassword: ", error);
    res.status(500).json({
      success: false,
      message: "Error al restablecer la contrasena",
    });
  }
};

// Devuelve el perfil del usuario autenticado y su empleado asociado si existe.
const getProfile = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT 
        u.id_usuario, 
        u.username, 
        u.email, 
        r.nombre_rol,
        e.nombres, 
        e.apellidos
      FROM usuarios u
      INNER JOIN roles r ON u.id_rol = r.id_rol
      LEFT JOIN empleados e ON u.id_empleado = e.id_empleado
      WHERE u.id_usuario = ?`,
      [req.user.id_usuario]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        succes: false,
        message: "Usuario no encontrado",
      });
    }

    res.json({
      success: true,
      succes: true,
      user: users[0],
    });
  } catch (error) {
    console.error("Error en getProfile:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener perfil",
    });
  }
};

module.exports = {
  login,
  register,
  requestPasswordReset,
  resetPassword,
  getProfile,
};
