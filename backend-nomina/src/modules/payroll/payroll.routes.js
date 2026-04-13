const express = require('express');
const router = express.Router();

const {
  createPayroll,
  getPayrollReport,
  downloadPayrollPdf,
  getPayrollNoveltiesPreview,
  getPayrollById
} = require('./payroll.controller');
const { verifyToken, verifyAdminORRRHH } = require('../../middleware/authMiddleware');

router.use(verifyToken);

router.get('/reportes', getPayrollReport);
router.get('/novedades', verifyAdminORRRHH, getPayrollNoveltiesPreview);
router.get('/:id_nomina/pdf', downloadPayrollPdf);
router.get('/:id_nomina', getPayrollById);
router.post('/', verifyAdminORRRHH, createPayroll);

module.exports = router;
