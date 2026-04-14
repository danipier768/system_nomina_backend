const express = require('express');

const {
  createVacationRequest,
  createPermissionRequest,
  createDisabilityRequest,
  createLicenseRequest,
  getMyRequests,
  getAllRequests,
  getApprovedRequestsReport,
  getVacationBalance,
  approveVacationRequest,
  rejectVacationRequest,
  cancelVacationRequest,
  approvePermissionRequest,
  rejectPermissionRequest,
  cancelPermissionRequest,
  approveDisabilityRequest,
  rejectDisabilityRequest,
  cancelDisabilityRequest,
  approveLicenseRequest,
  rejectLicenseRequest,
  cancelLicenseRequest
} = require('./requests.controller');
const { verifyToken, verifyAdminORRRHH } = require('../../middleware/authMiddleware');

const router = express.Router();

// Todas las rutas de solicitudes requieren usuario autenticado.
router.use(verifyToken);

// Crear una nueva solicitud de vacaciones.
router.post('/vacaciones', createVacationRequest);

// Crear una nueva solicitud de permiso.
router.post('/permisos', createPermissionRequest);

// Crear una nueva solicitud de incapacidad.
router.post('/incapacidades', createDisabilityRequest);

// Crear una nueva solicitud de licencia.
router.post('/licencias', createLicenseRequest);

// Consultar el historial de solicitudes del usuario autenticado.
router.get('/mis-solicitudes', getMyRequests);

// Consultar todas las solicitudes para gestion de RRHH o administracion.
router.get('/', verifyAdminORRRHH, getAllRequests);
router.get('/reportes/aprobadas', verifyAdminORRRHH, getApprovedRequestsReport);

// Consultar saldo de vacaciones por empleado.
router.get('/vacaciones/saldo/:id_empleado', getVacationBalance);

// Aprobar una solicitud de vacaciones y descontar dias del saldo.
router.patch('/vacaciones/:id/aprobar', verifyAdminORRRHH, approveVacationRequest);

// Rechazar una solicitud de vacaciones sin tocar el saldo.
router.patch('/vacaciones/:id/rechazar', verifyAdminORRRHH, rejectVacationRequest);

// Cancelar una solicitud de vacaciones. Si estaba aprobada, devuelve dias al saldo.
router.patch('/vacaciones/:id/cancelar', verifyAdminORRRHH, cancelVacationRequest);

// Aprobar una solicitud de permiso.
router.patch('/permisos/:id/aprobar', verifyAdminORRRHH, approvePermissionRequest);

// Rechazar una solicitud de permiso.
router.patch('/permisos/:id/rechazar', verifyAdminORRRHH, rejectPermissionRequest);

// Cancelar una solicitud de permiso.
router.patch('/permisos/:id/cancelar', verifyAdminORRRHH, cancelPermissionRequest);

// Aprobar una solicitud de incapacidad.
router.patch('/incapacidades/:id/aprobar', verifyAdminORRRHH, approveDisabilityRequest);

// Rechazar una solicitud de incapacidad.
router.patch('/incapacidades/:id/rechazar', verifyAdminORRRHH, rejectDisabilityRequest);

// Cancelar una solicitud de incapacidad.
router.patch('/incapacidades/:id/cancelar', verifyAdminORRRHH, cancelDisabilityRequest);

// Aprobar una solicitud de licencia.
router.patch('/licencias/:id/aprobar', verifyAdminORRRHH, approveLicenseRequest);

// Rechazar una solicitud de licencia.
router.patch('/licencias/:id/rechazar', verifyAdminORRRHH, rejectLicenseRequest);

// Cancelar una solicitud de licencia.
router.patch('/licencias/:id/cancelar', verifyAdminORRRHH, cancelLicenseRequest);

module.exports = router;
