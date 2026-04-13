const fs = require('fs/promises');
const path = require('path');
const {
  VACATION_TYPE,
  PERMISSION_TYPE,
  DISABILITY_TYPE,
  LICENSE_TYPE,
  VALID_ORIGINS,
  SUPPORT_FILES_DIR
} = require('./requests.constants');

// Crea errores controlados para que el frontend reciba el mensaje exacto.
const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Calcula dias calendario incluyendo fecha inicial y final.
const calculateRequestedDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
};

const normalizePayrollOrigin = (originValue) => {
  if (!originValue) {
    return null;
  }

  const normalizedOrigin = String(originValue).trim().toUpperCase();
  return VALID_ORIGINS.has(normalizedOrigin) ? normalizedOrigin : null;
};

const getPayrollImpactData = ({ requestType, body }) => {
  const rawIsRemunerated = String(body.es_remunerado || '').trim().toUpperCase();
  const normalizedOrigin = normalizePayrollOrigin(body.origen_novedad || body.sub_tipo);
  const requestedHours = body.horas_solicitadas === '' || body.horas_solicitadas === undefined || body.horas_solicitadas === null
    ? null
    : Number(body.horas_solicitadas);

  let isRemunerated = rawIsRemunerated === 'NO' ? 0 : 1;
  let paymentPercentage = body.porcentaje_pago === '' || body.porcentaje_pago === undefined || body.porcentaje_pago === null
    ? null
    : Number(body.porcentaje_pago);

  if (requestType === VACATION_TYPE) {
    isRemunerated = 1;
    paymentPercentage = 100;
  }

  if (requestType === DISABILITY_TYPE) {
    isRemunerated = 1;
    paymentPercentage = paymentPercentage ?? (normalizedOrigin === 'LABORAL' ? 100 : 66.67);
  }

  if ((requestType === PERMISSION_TYPE || requestType === LICENSE_TYPE) && paymentPercentage === null) {
    paymentPercentage = isRemunerated ? 100 : 0;
  }

  return {
    esRemunerado: isRemunerated,
    porcentajePago: paymentPercentage,
    origenNovedad: requestType === DISABILITY_TYPE ? normalizedOrigin || 'COMUN' : normalizedOrigin,
    horasSolicitadas: requestedHours
  };
};

const getAutomaticPayrollImpactDataForEmployee = ({ requestType, body }) => {
  const normalizedSubtype = String(body.sub_tipo || '').trim().toUpperCase();
  const normalizedOrigin = normalizePayrollOrigin(body.origen_novedad || body.sub_tipo);
  const requestedHours = body.horas_solicitadas === '' || body.horas_solicitadas === undefined || body.horas_solicitadas === null
    ? null
    : Number(body.horas_solicitadas);

  if (requestType === VACATION_TYPE) {
    return {
      esRemunerado: 1,
      porcentajePago: 100,
      origenNovedad: null,
      horasSolicitadas: requestedHours
    };
  }

  if (requestType === PERMISSION_TYPE) {
    const isUnpaidPermission = normalizedSubtype.includes('NO REMUNERADO');

    return {
      esRemunerado: isUnpaidPermission ? 0 : 1,
      porcentajePago: isUnpaidPermission ? 0 : 100,
      origenNovedad: null,
      horasSolicitadas: requestedHours
    };
  }

  if (requestType === DISABILITY_TYPE) {
    const origin = normalizedOrigin || (normalizedSubtype.includes('LABORAL') ? 'LABORAL' : 'COMUN');

    return {
      esRemunerado: 1,
      porcentajePago: origin === 'LABORAL' ? 100 : 66.67,
      origenNovedad: origin,
      horasSolicitadas: null
    };
  }

  if (requestType === LICENSE_TYPE) {
    const isPaidLicense = normalizedSubtype === 'MATERNIDAD' ||
      normalizedSubtype === 'PATERNIDAD' ||
      normalizedSubtype === 'LUTO' ||
      normalizedSubtype === 'CALAMIDAD DOMESTICA';

    return {
      esRemunerado: isPaidLicense ? 1 : 0,
      porcentajePago: isPaidLicense ? 100 : 0,
      origenNovedad: null,
      horasSolicitadas: null
    };
  }

  return getPayrollImpactData({ requestType, body });
};

const validatePayrollImpactData = ({ requestType, payrollImpactData }) => {
  if (
    payrollImpactData.porcentajePago === null ||
    Number.isNaN(payrollImpactData.porcentajePago) ||
    payrollImpactData.porcentajePago < 0 ||
    payrollImpactData.porcentajePago > 100
  ) {
    return 'El porcentaje de pago debe estar entre 0 y 100';
  }

  if (
    payrollImpactData.horasSolicitadas !== null &&
    (Number.isNaN(payrollImpactData.horasSolicitadas) || payrollImpactData.horasSolicitadas <= 0)
  ) {
    return 'Las horas solicitadas deben ser mayores a cero';
  }

  if (requestType === DISABILITY_TYPE && !payrollImpactData.origenNovedad) {
    return 'Debes indicar si la incapacidad es de origen comun o laboral';
  }

  return null;
};

const getEmployeeIdForRequest = (req) => {
  if (req.user?.rol === 'EMPLEADO') {
    return Number(req.user.id_empleado) || null;
  }

  return Number(req.body.id_empleado) || null;
};

const saveSupportFile = async ({ supportFile, requestType, employeeId }) => {
  if (!supportFile?.content || !supportFile?.name) {
    return null;
  }

  const allowedMimeTypes = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg'
  ]);

  if (supportFile.type && !allowedMimeTypes.has(supportFile.type)) {
    throw createHttpError('Tipo de archivo no permitido. Usa PDF, PNG o JPG.', 400);
  }

  const cleanExtension = path.extname(supportFile.name).replace(/[^a-zA-Z0-9.]/g, '') || '.bin';
  const safeRequestType = String(requestType).toLowerCase();
  const fileName = `${safeRequestType}-${employeeId}-${Date.now()}${cleanExtension}`;

  await fs.mkdir(SUPPORT_FILES_DIR, { recursive: true });

  const fileBuffer = Buffer.from(String(supportFile.content), 'base64');

  if (fileBuffer.length > 5 * 1024 * 1024) {
    throw createHttpError('El archivo supera el tamano maximo permitido de 5 MB.', 413);
  }

  const fullPath = path.join(SUPPORT_FILES_DIR, fileName);
  await fs.writeFile(fullPath, fileBuffer);

  return `/uploads/solicitudes/${fileName}`;
};

const buildApprovalPayrollSnapshot = ({ requestRow }) => {
  const totalDays = Number(requestRow.dias_solicitados) || 0;
  const totalHours = Number(requestRow.horas_solicitadas) || 0;
  const percentage = Number(requestRow.porcentaje_pago) || 0;
  const isRemunerated = Number(requestRow.es_remunerado) === 1;
  const unit = totalHours > 0 ? 'HORAS' : 'DIAS';
  const quantity = totalHours > 0 ? totalHours : totalDays;
  const unpaidPercentage = Number((100 - percentage).toFixed(2));

  return {
    tipo: requestRow.tipo,
    sub_tipo: requestRow.sub_tipo,
    origen_novedad: requestRow.origen_novedad,
    unidad: unit,
    cantidad: quantity,
    es_remunerado: isRemunerated,
    porcentaje_pago: percentage,
    porcentaje_deduccion_estimado: unpaidPercentage < 0 ? 0 : unpaidPercentage,
    generado_en: new Date().toISOString()
  };
};

module.exports = {
  createHttpError,
  calculateRequestedDays,
  normalizePayrollOrigin,
  getPayrollImpactData,
  getAutomaticPayrollImpactDataForEmployee,
  validatePayrollImpactData,
  getEmployeeIdForRequest,
  saveSupportFile,
  buildApprovalPayrollSnapshot
};
