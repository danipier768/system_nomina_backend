const express = require('express');
const router = express.Router();

const {
  calcularLiquidacion,
  guardarLiquidacion,
  getLiquidaciones,
  getLiquidacionById,
  anularLiquidacion,
  marcarPagada,
  downloadLiquidacionPdf,
  getRecontratacionConfig,
  updateRecontratacionConfig,
  getJornadaLaboralConfig,
  updateJornadaLaboralConfig,
  revertirPago,
  revertirAnulacion,
  deleteLiquidacion
} = require('./liquidacion.controller');

const { verifyToken, verifyAdminORRRHH } = require('../../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', getLiquidaciones);
router.get('/:id_liquidacion', getLiquidacionById);
router.post('/calcular', verifyAdminORRRHH, calcularLiquidacion);
router.post('/', verifyAdminORRRHH, guardarLiquidacion);
router.put('/:id_liquidacion/pagar', verifyAdminORRRHH, marcarPagada);
router.put('/:id_liquidacion/anular', verifyAdminORRRHH, anularLiquidacion);
router.put('/:id_liquidacion/revertir-pago', verifyAdminORRRHH, revertirPago);
router.put('/:id_liquidacion/revertir-anulacion', verifyAdminORRRHH, revertirAnulacion);
router.delete('/:id_liquidacion', verifyAdminORRRHH, deleteLiquidacion);
router.get('/:id_liquidacion/pdf', downloadLiquidacionPdf);

// Configuracion de recontratacion
router.get('/config/recontratacion', verifyAdminORRRHH, getRecontratacionConfig);
router.put('/config/recontratacion', verifyAdminORRRHH, updateRecontratacionConfig);

// Configuracion de jornada laboral global
router.get('/config/jornada-laboral', verifyAdminORRRHH, getJornadaLaboralConfig);
router.put('/config/jornada-laboral', verifyAdminORRRHH, updateJornadaLaboralConfig);

module.exports = router;
