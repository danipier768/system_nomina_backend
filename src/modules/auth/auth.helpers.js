const crypto = require("crypto");
const {
  PASSWORD_RESET_EXPIRATION_MINUTES,
} = require("./auth.constants");

// Valida el formato basico de un email.
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Genera el token numerico de recuperacion.
const generatePasswordResetToken = () =>
  crypto.randomInt(100000, 999999).toString();

// Construye la fecha de expiracion del token de recuperacion.
const buildPasswordResetExpiration = () =>
  new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MINUTES * 60 * 1000);

module.exports = {
  isValidEmail,
  generatePasswordResetToken,
  buildPasswordResetExpiration,
};
