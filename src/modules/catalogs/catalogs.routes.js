const express = require("express");
const router = express.Router();

const {
  getAllCargos,
  getAllDepartamentos,
  getAllRoles,
} = require("./catalogs.controller");

const { verifyToken } = require("../../middleware/authMiddleware");

// Todas las rutas de catalogos requieren autenticacion.
router.use(verifyToken);

router.get("/cargos", getAllCargos);
router.get("/departamentos", getAllDepartamentos);
router.get("/roles", getAllRoles);

module.exports = router;
