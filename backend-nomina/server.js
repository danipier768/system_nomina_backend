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
  ensureDefaultDepartments,
  ensurePayrollSupportTables
} = require('./src/config/database.js');
const { verifyConnection } = require('./src/services/emailService');

const authRoutes = require('./src/modules/auth/auth.routes.js');
const employeeRoutes = require('./src/modules/employees/employees.routes.js');
const userRoutes = require('./src/modules/users/users.routes.js');
const catalogRoutes = require('./src/modules/catalogs/catalogs.routes.js');
const nominaRoutes = require('./src/modules/payroll/payroll.routes.js');
const solicitudesRoutes = require('./src/modules/requests/requests.routes.js');

const app = express();
const PORT = process.env.PORT || 5000;

// Permite que el frontend consuma la API del backend.
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  })
);

// Se usa un limite amplio porque los soportes viajan en base64 y pesan mas.
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Logger basico para ver cada peticion que entra al servidor.
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toLocaleDateString()}`);
  next();
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    succes: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', async (req, res) => {
  let dbConnected = false;

  try {
    dbConnected = await testConnection();
  } catch (err) {
    console.warn('DB no conectada, pero el servidor sigue:', err.message);
  }

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

app.use((req, res) => {
  res.status(404).json({
    success: false,
    succes: false,
    message: 'Ruta no encontrada'
  });
});

// Captura errores globales y da un mensaje claro cuando el body supera el limite.
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

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

const startServer = async () => {
  try {
    console.log('Probando conexion a la base de datos...');
    const dbConnected = await testConnection();

    console.log('Probando conexion al servidor de email...');
    try {
      await verifyConnection();
    } catch (err) {
      console.warn('Email no disponible:', err.message);
    }

    if (!dbConnected) {
      console.error('Advertencia: No se pudo conectar a la base de datos');
      console.log('Verifica tu archivo .env y que MySQL este corriendo');
    }

    if (dbConnected) {
      console.log('Verificando migraciones minimas de base de datos...');
      await ensureEmployeeSalaryColumn();
      await ensureDefaultDepartments();
      await ensurePayrollSupportTables();
    }

    app.listen(PORT, () => {
      console.log(`Servidor iniciado en puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
    console.log('El servidor continuará ejecutándose...');
  }
};

startServer();

process.on('SIGTERM', () => {
  console.log('\nSenal SIGTERM recibida. Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSenal SIGINT recibida. Cerrando servidor...');
  process.exit(0);
});
