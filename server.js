
// SERVIDOR PRINCIPAL - EXPRESS
// Archivo: server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const {
  testConnection,
  ensureEmployeeSalaryColumn,
  ensureEmployeeWithdrawalColumn,
  ensureDefaultDepartments,
  ensurePayrollSupportTables,
  ensurePrestacionesLiquidacionTables,
  ensureRehiringParameters,
  ensureJornadaLaboralColumn,
  ensureGlobalJornadaLaboralColumn,
  ensureNominaStatusColumn
} = require('./src/config/database.js');
const { verifyConnection } = require('./src/services/emailService');
const { verifyToken } = require('./src/middleware/authMiddleware');
const logger = require('./src/utils/logger');

const authRoutes = require('./src/modules/auth/auth.routes.js');
const employeeRoutes = require('./src/modules/employees/employees.routes.js');
const userRoutes = require('./src/modules/users/users.routes.js');
const catalogRoutes = require('./src/modules/catalogs/catalogs.routes.js');
const nominaRoutes = require('./src/modules/payroll/payroll.routes.js');
const solicitudesRoutes = require('./src/modules/requests/requests.routes.js');
const prestacionesRoutes = require('./src/modules/prestaciones/prestaciones.routes.js');
const liquidacionRoutes = require('./src/modules/liquidacion/liquidacion.routes.js');

const app = express();
const PORT = process.env.PORT || 5000;

// Permite que el frontend consuma la API del backend.
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'https://system-payroll-pydz.vercel.app',
    'https://system-nomina-dsv.vercel.app'
  ],
  credentials: true
}));

// Se usa un limite amplio porque los soportes viajan en base64 y pesan mas.
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`${req.method} ${req.path}`);
  }
  next();
});

// Rate limiting para login y reset de contraseña
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/request-reset', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();

  res.json({
    success: true,
    server: 'online',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Sirve archivos estaticos solo si el usuario esta autenticado.
app.use('/uploads', verifyToken, express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/catalogs', catalogRoutes);
app.use('/api/nomina', nominaRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/prestaciones', prestacionesRoutes);
app.use('/api/liquidacion', liquidacionRoutes);

app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack);
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'El archivo o formulario supera el tamano maximo permitido por el servidor'
    });
  }

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const initializeApp = async () => {
  try {
    logger.info('Probando conexion a la base de datos...');
    const dbConnected = await testConnection();

    logger.info('Probando conexion al servidor de email...');
    await verifyConnection();

    if (!dbConnected) {
      logger.warn('No se pudo conectar a la base de datos');
    }

    if (dbConnected) {
      logger.info('Verificando migraciones minimas de base de datos...');
      await ensureEmployeeSalaryColumn();
      await ensureEmployeeWithdrawalColumn();
      await ensureDefaultDepartments();
      await ensurePayrollSupportTables();
      await ensurePrestacionesLiquidacionTables();
      await ensureRehiringParameters();
      await ensureJornadaLaboralColumn();
      await ensureGlobalJornadaLaboralColumn();
      await ensureNominaStatusColumn();
    }
  } catch (error) {
    logger.error('Error durante la inicialización:', error.message);
  }
};

// Iniciar inicialización (no bloqueante para Vercel)
initializeApp();

// Exportar para Vercel
module.exports = app;

// Solo escuchar si no estamos en Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info('='.repeat(50));
    logger.info('SERVIDOR INICIADO LOCALMENTE');
    logger.info('='.repeat(50));
    logger.info(`URL: http://localhost:${PORT}`);
    logger.info(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Base de datos: ${process.env.DB_NAME}`);
    logger.info('='.repeat(50));
  });
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason instanceof Error ? reason.message : reason);
  if (process.env.NODE_ENV === 'development') {
    logger.error(reason instanceof Error ? reason.stack : reason);
  }
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.message);
  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack);
  }
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.warn('Senal SIGTERM recibida. Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.warn('Senal SIGINT recibida. Cerrando servidor...');
  process.exit(0);
});
