// Reglas base del modulo de autenticacion.
const PASSWORD_MIN_LENGTH = 6;
const JWT_EXPIRES_IN = "2h";
const PASSWORD_RESET_EXPIRATION_MINUTES = 10;

module.exports = {
  PASSWORD_MIN_LENGTH,
  JWT_EXPIRES_IN,
  PASSWORD_RESET_EXPIRATION_MINUTES,
};
