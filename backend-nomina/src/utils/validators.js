/**
 * Validadores para campos de empleados y usuarios
 * Casos de prueba según especificación
 */

/**
 * Valida nombres (solo letras y espacios, 2-50 caracteres)
 * @param {string} nombre - Nombre a validar
 * @returns {object} { isValid, error }
 */
const validateName = (nombre) => {
  if (!nombre || nombre.trim() === '') {
    return { isValid: false, error: 'Campo vacío' };
  }

  const length = nombre.trim().length;
  
  // Validar longitud: mínimo 2, máximo 50
  if (length < 2) {
    return { isValid: false, error: 'Longitud por debajo del mínimo (mínimo 2 caracteres)' };
  }
  
  if (length > 50) {
    return { isValid: false, error: 'Longitud excede el máximo (máximo 50 caracteres)' };
  }

  // Validar que solo contenga letras, espacios y acentos
  const nameRegex = /^[a-záéíóúñüA-ZÁÉÍÓÚÑÜ\s]+$/;
  if (!nameRegex.test(nombre)) {
    return { isValid: false, error: 'Nombre contiene números o caracteres especiales' };
  }

  return { isValid: true, error: null };
};

/**
 * Valida email (formato y longitud)
 * @param {string} email - Email a validar
 * @returns {object} { isValid, error }
 */
const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Campo vacío' };
  }

  // Verificar espacios
  if (email.includes(' ')) {
    return { isValid: false, error: 'Email contiene espacios' };
  }

  // Validar formato de email estándar
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Formato de email inválido' };
  }

  return { isValid: true, error: null };
};

/**
 * Valida contraseña (mínimo 8 caracteres, máximo 20, con mayúscula, número y carácter especial)
 * @param {string} password - Contraseña a validar
 * @returns {object} { isValid, error }
 */
const validatePassword = (password) => {
  if (!password || password.trim() === '') {
    return { isValid: false, error: 'Campo vacío' };
  }

  const length = password.length;

  // Validar longitud: mínimo 8, máximo 20
  if (length < 8) {
    return { isValid: false, error: 'Contraseña muy corta (mínimo 8 caracteres)' };
  }

  if (length > 20) {
    return { isValid: false, error: 'Contraseña muy larga (máximo 20 caracteres)' };
  }

  // Validar que contenga al menos una mayúscula
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Contraseña debe contener al menos una mayúscula (A-Z)' };
  }

  // Validar que contenga al menos un número
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Contraseña debe contener al menos un número (0-9)' };
  }

  // Validar que contenga al menos un carácter especial
  if (!/[!@#$%^&*()_+\-=\[\]{};:'",.<>?\/\\|`~]/.test(password)) {
    return { isValid: false, error: 'Contraseña debe contener al menos un carácter especial (!@#$%^&*...)' };
  }

  return { isValid: true, error: null };
};

/**
 * Valida que dos contraseñas coincidan
 * @param {string} password - Contraseña
 * @param {string} confirmPassword - Confirmación de contraseña
 * @returns {object} { isValid, error }
 */
const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Las contraseñas no coinciden' };
  }

  return { isValid: true, error: null };
};

/**
 * Valida número de identificación (no vacío, formato básico)
 * @param {string} numero - Número de identificación
 * @returns {object} { isValid, error }
 */
const validateIdentificationNumber = (numero) => {
  if (!numero || numero.trim() === '') {
    return { isValid: false, error: 'Número de identificación requerido' };
  }

  // Solo números y algunos caracteres especiales comunes en IDs
  const idRegex = /^[0-9\-]+$/;
  if (!idRegex.test(numero)) {
    return { isValid: false, error: 'Número de identificación inválido' };
  }

  return { isValid: true, error: null };
};

/**
 * Valida campo numérico (salario, etc)
 * @param {number|string} value - Valor a validar
 * @param {number} min - Valor mínimo (opcional)
 * @param {number} max - Valor máximo (opcional)
 * @returns {object} { isValid, error }
 */
const validateNumericField = (value, min = 0, max = null) => {
  if (value === undefined || value === null || value === '') {
    return { isValid: false, error: 'Campo numérico requerido' };
  }

  const num = parseFloat(value);

  if (isNaN(num)) {
    return { isValid: false, error: 'Debe ser un número válido' };
  }

  if (num < min) {
    return { isValid: false, error: `Valor mínimo permitido: ${min}` };
  }

  if (max !== null && num > max) {
    return { isValid: false, error: `Valor máximo permitido: ${max}` };
  }

  return { isValid: true, error: null };
};

/**
 * Valida fecha (formato YYYY-MM-DD)
 * @param {string} date - Fecha a validar
 * @returns {object} { isValid, error }
 */
const validateDate = (date) => {
  if (!date) {
    return { isValid: false, error: 'Fecha requerida' };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return { isValid: false, error: 'Formato de fecha inválido (use YYYY-MM-DD)' };
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Fecha inválida' };
  }

  return { isValid: true, error: null };
};

/**
 * Valida edad mínima (18 años)
 * @param {string} birthDate - Fecha de nacimiento (YYYY-MM-DD)
 * @param {number} minAge - Edad mínima (default 18)
 * @returns {object} { isValid, error }
 */
const validateMinimumAge = (birthDate, minAge = 18) => {
  const dateValidation = validateDate(birthDate);
  if (!dateValidation.isValid) {
    return dateValidation;
  }

  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  if (age < minAge) {
    return { isValid: false, error: `Debe tener al menos ${minAge} años` };
  }

  return { isValid: true, error: null };
};

/**
 * Valida username (3-50 caracteres, alfanuméricos y guiones)
 * @param {string} username - Username a validar
 * @returns {object} { isValid, error }
 */
const validateUsername = (username) => {
  if (!username || username.trim() === '') {
    return { isValid: false, error: 'Username requerido' };
  }

  const length = username.trim().length;

  if (length < 3) {
    return { isValid: false, error: 'Username muy corto (mínimo 3 caracteres)' };
  }

  if (length > 50) {
    return { isValid: false, error: 'Username muy largo (máximo 50 caracteres)' };
  }

  // Validar que solo contenga letras, números, guiones y guiones bajos
  const usernameRegex = /^[a-zA-Z0-9_\-]+$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, error: 'Username solo puede contener letras, números, guiones y guiones bajos' };
  }

  return { isValid: true, error: null };
};

/**
 * Valida inputs de login
 * @param {string} username - Username
 * @param {string} password - Contraseña
 * @returns {object} { isValid, error }
 */
const validateLoginInput = (username, password) => {
  if (!username || username.trim() === '') {
    return { isValid: false, error: 'Usuario requerido' };
  }

  if (!password || password.trim() === '') {
    return { isValid: false, error: 'Contraseña requerida' };
  }

  // Validar longitud mínima del username
  if (username.trim().length < 1) {
    return { isValid: false, error: 'Usuario inválido' };
  }

  // Validar longitud mínima de contraseña
  if (password.length < 1) {
    return { isValid: false, error: 'Contraseña inválida' };
  }

  return { isValid: true, error: null };
};

/**
 * Valida token de recuperación de contraseña
 * @param {string} token - Token a validar
 * @returns {object} { isValid, error }
 */
const validateResetToken = (token) => {
  if (!token || token.trim() === '') {
    return { isValid: false, error: 'Token requerido' };
  }

  if (token.length < 10) {
    return { isValid: false, error: 'Token inválido' };
  }

  return { isValid: true, error: null };
};

module.exports = {
  validateName,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateIdentificationNumber,
  validateNumericField,
  validateDate,
  validateMinimumAge,
  validateUsername,
  validateLoginInput,
  validateResetToken,
};
