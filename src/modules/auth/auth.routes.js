const express = require("express");
const router = express.Router();

const {
  login,
  register,
  requestPasswordReset,
  resetPassword,
  getProfile,
} = require("./auth.controller.js");

const {
  verifyToken,
  verifyAdminORRRHH,
} = require("../../middleware/authMiddleware.js");

// Rutas publicas de autenticacion.
router.post("/login", login);
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

// Rutas protegidas para administracion y perfil.
// router.post("/register", verifyToken, verifyAdminORRRHH, register);
router.post('/register', register);
router.get("/profile", verifyToken, getProfile);

// Ruta rapida para validar el montaje del modulo.
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Rutas de autenticacion funcionando correctamente",
    routes: {
      public: [
        "POST /api/auth/login",
        "POST /api/auth/request-reset",
        "POST /api/auth/reset-password",
      ],
      protected: [
        "POST /api/auth/register (Admin/RRHH)",
        "GET /api/auth/profile (Authenticated)",
      ],
    },
  });
});

module.exports = router;
