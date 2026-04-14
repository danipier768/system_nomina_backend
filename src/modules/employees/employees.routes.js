const express = require("express");
const router = express.Router();

const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  reactivateEmployee,
  searchEmployees,
} = require("./employees.controller");

const {
  verifyToken,
  verifyAdminORRRHH,
} = require("../../middleware/authMiddleware");

// Todas las rutas del modulo requieren autenticacion.
router.use(verifyToken);

// Consultas disponibles para cualquier usuario autenticado.
router.get("/", getAllEmployees);
router.get("/search", searchEmployees);
router.get("/:id", getEmployeeById);

// Operaciones de administracion reservadas para Admin y RRHH.
router.post("/", verifyAdminORRRHH, createEmployee);
router.put("/:id", verifyAdminORRRHH, updateEmployee);
router.put("/:id/reactivate", verifyAdminORRRHH, reactivateEmployee);
router.delete("/:id", verifyAdminORRRHH, deleteEmployee);

module.exports = router;
