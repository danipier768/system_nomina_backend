const { pool } = require("../../config/database.js");
const { isCurrentUser, buildUserUpdateQuery } = require("./users.helpers");

// Lista todos los usuarios con su rol y empleado asociado.
const getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id_usuario,
        u.username,
        u.email,
        r.nombre_rol as rol,
        u.activo,
        CONCAT(e.nombres, ' ', e.apellidos) as empleado_nombre,
        e.id_empleado
      FROM usuarios u
      INNER JOIN roles r ON u.id_rol = r.id_rol
      LEFT JOIN empleados e ON u.id_empleado = e.id_empleado
      ORDER BY u.id_usuario DESC
    `;

    const [users] = await pool.query(query);

    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener usuarios",
      error: error.message,
    });
  }
};

// Obtiene el detalle de un usuario por id.
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        u.id_usuario,
        u.username,
        u.email,
        r.nombre_rol as rol,
        u.activo,
        u.id_empleado,
        CONCAT(e.nombres, ' ', e.apellidos) as empleado_nombre
      FROM usuarios u
      INNER JOIN roles r ON u.id_rol = r.id_rol
      LEFT JOIN empleados e ON u.id_empleado = e.id_empleado
      WHERE u.id_usuario = ?
    `;

    const [users] = await pool.query(query, [id]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    res.json({
      success: true,
      data: users[0],
    });
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener usuario",
      error: error.message,
    });
  }
};

// Actualiza email, rol y empleado asociado de un usuario.
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, rol, id_empleado } = req.body;

    const [userExists] = await pool.query(
      "SELECT id_usuario FROM usuarios WHERE id_usuario = ?",
      [id]
    );

    if (userExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    if (email) {
      const [emailExists] = await pool.query(
        "SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?",
        [email, id]
      );

      if (emailExists.length > 0) {
        return res.status(409).json({
          success: false,
          message: "El email ya esta en uso por otro usuario",
        });
      }
    }

    let roleId;
    if (rol) {
      const [roles] = await pool.query(
        "SELECT id_rol FROM roles WHERE nombre_rol = ?",
        [rol]
      );

      if (roles.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Rol invalido",
        });
      }

      roleId = roles[0].id_rol;
    }

    if (id_empleado !== undefined && id_empleado) {
      const [empHasUser] = await pool.query(
        "SELECT id_usuario FROM usuarios WHERE id_empleado = ? AND id_usuario != ?",
        [id_empleado, id]
      );

      if (empHasUser.length > 0) {
        return res.status(409).json({
          success: false,
          message: "El empleado ya tiene un usuario asociado",
        });
      }
    }

    const { updates, values } = buildUserUpdateQuery({
      email,
      roleId,
      employeeIdProvided: id_empleado !== undefined,
      employeeId: id_empleado,
    });

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No hay campos para actualizar",
      });
    }

    values.push(id);

    await pool.query(
      `UPDATE usuarios SET ${updates.join(", ")} WHERE id_usuario = ?`,
      values
    );

    res.json({
      success: true,
      message: "Usuario actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar usuario",
      error: error.message,
    });
  }
};

// Elimina usuarios, excepto el que esta autenticado actualmente.
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [userExists] = await pool.query(
      "SELECT id_usuario FROM usuarios WHERE id_usuario = ?",
      [id]
    );

    if (userExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    if (isCurrentUser(req.user.id_usuario, id)) {
      return res.status(400).json({
        success: false,
        message: "No puedes eliminar tu propio usuario",
      });
    }

    await pool.query("DELETE FROM usuarios WHERE id_usuario = ?", [id]);

    res.json({
      success: true,
      message: "Usuario eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar usuario",
      error: error.message,
    });
  }
};

// Activa o desactiva usuarios sin permitir desactivar al usuario actual.
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [user] = await pool.query(
      "SELECT activo FROM usuarios WHERE id_usuario = ?",
      [id]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    if (isCurrentUser(req.user.id_usuario, id) && user[0].activo) {
      return res.status(400).json({
        success: false,
        message: "No puedes desactivar tu propio usuario",
      });
    }

    const newStatus = !user[0].activo;

    await pool.query(
      "UPDATE usuarios SET activo = ? WHERE id_usuario = ?",
      [newStatus, id]
    );

    res.json({
      success: true,
      message: `Usuario ${newStatus ? "activado" : "desactivado"} exitosamente`,
      data: { activo: newStatus },
    });
  } catch (error) {
    console.error("Error al cambiar estado del usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al cambiar estado del usuario",
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
};
