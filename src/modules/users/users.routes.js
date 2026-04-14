const express = require("express");
const router = express.Router();

const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
} = require("./users.controller");

const {
  verifyToken,
  verifyAdmin,
} = require("../../middleware/authMiddleware");

// Este modulo mantiene el mismo permiso actual: solo administradores.
router.use(verifyToken);
router.use(verifyAdmin);

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.patch("/:id/toggle-status", toggleUserStatus);

module.exports = router;
