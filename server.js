// ============================================
// SERVIDOR PRINCIPAL - EXPRESS
// Archivo: server.js
// ============================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

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
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

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

// Expone los soportes guardados para que el frontend pueda consultarlos.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
    console.error('Error:', err.stack);
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
    console.log('Probando conexion a la base de datos...');
    const dbConnected = await testConnection();

    console.log('Probando conexion al servidor de email...');
    await verifyConnection();

    if (!dbConnected) {
      console.error('Advertencia: No se pudo conectar a la base de datos');
    }

    if (dbConnected) {
      console.log('Verificando migraciones minimas de base de datos...');
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
    console.error('Error durante la inicialización:', error.message);
  }
};

// Iniciar inicialización (no bloqueante para Vercel)
initializeApp();

// Exportar para Vercel
module.exports = app;

// Solo escuchar si no estamos en Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('SERVIDOR INICIADO LOCALMENTE');
    console.log('='.repeat(50));
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Base de datos: ${process.env.DB_NAME}`);
    console.log('='.repeat(50) + '\n');
  });
}

process.on('SIGTERM', () => {
  console.log('\nSenal SIGTERM recibida. Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSenal SIGINT recibida. Cerrando servidor...');
  process.exit(0);
});
