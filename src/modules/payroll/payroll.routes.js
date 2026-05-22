const express = require('express');
const router = express.Router();

const {
  createPayroll,
  deletePayrollsByEmployee,
  getPayrollReport,
  downloadPayrollReportExcel,
  downloadPayrollReportPdf,
  downloadPayrollPdf,
  getPayrollNoveltiesPreview,
  getPayrollById,
  getPayrollParameters,
  updatePayrollParameters
} = require('./payroll.controller');
const { verifyToken, verifyAdminORRRHH } = require('../../middleware/authMiddleware');

router.use(verifyToken);
router.get('/parametros', getPayrollParameters);
router.put('/parametros', verifyAdminORRRHH, updatePayrollParameters);
router.get('/reportes', getPayrollReport);
router.get('/reportes/export/excel', verifyAdminORRRHH, downloadPayrollReportExcel);
router.get('/reportes/export/pdf', verifyAdminORRRHH, downloadPayrollReportPdf);
router.get('/novedades', verifyAdminORRRHH, getPayrollNoveltiesPreview);
router.post('/', verifyAdminORRRHH, createPayroll);
router.delete('/empleado/:id_empleado', verifyAdminORRRHH, deletePayrollsByEmployee);
router.get('/:id_nomina', getPayrollById);
router.get('/:id_nomina/pdf', downloadPayrollPdf);

module.exports = router;
