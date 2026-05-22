// Verifica si el id solicitado pertenece al usuario autenticado.
const isCurrentUser = (authUserId, targetUserId) =>
  Number(authUserId) === Number(targetUserId);

// Construye un UPDATE dinamico para la tabla usuarios.
const buildUserUpdateQuery = ({ email, roleId, employeeIdProvided, employeeId }) => {
  const updates = [];
  const values = [];

  if (email) {
    updates.push("email = ?");
    values.push(email);
  }

  if (roleId) {
    updates.push("id_rol = ?");
    values.push(roleId);
  }

  if (employeeIdProvided) {
    updates.push("id_empleado = ?");
    values.push(employeeId || null);
  }

  return { updates, values };
};

module.exports = {
  isCurrentUser,
  buildUserUpdateQuery,
};
