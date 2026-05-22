const express = require('express');
const router = express.Router();

const {
  getPrestacionesResumen,
  acumularPrestaciones,
  acumularPrestacionesMasivo
} = require('./prestaciones.controller');

const { verifyToken, verifyAdminORRRHH } = require('../../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', getPrestacionesResumen);
router.post('/acumular', verifyAdminORRRHH, acumularPrestaciones);
router.post('/acumular/masivo', verifyAdminORRRHH, acumularPrestacionesMasivo);

module.exports = router;
