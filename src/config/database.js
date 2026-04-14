
//database.js
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 30000,
});

const promisePool = pool.promise()


const DEFAULT_DEPARTMENTS = [
    'Gerencia General',
    'Administración',
    'Recursos Humanos (Gestión Humana)',
    'Finanzas',
    'Contabilidad',
    'Tesorería',
    'Compras',
    'Ventas',
    'Comercial',
    'Mercadeo (Marketing)',
    'Servicio al Cliente',
    'Operaciones',
    'Producción',
    'Logística',
    'Almacén / Bodega',
    'Tecnología de la Información (TI / Sistemas)',
    'Desarrollo de Software',
    'Infraestructura Tecnológica',
    'Seguridad de la Información',
    'Calidad',
    'Auditoría Interna',
    'Jurídica / Legal',
    'Planeación / Estrategia',
    'Investigación y Desarrollo (I+D)',
    'Mantenimiento',
    'Seguridad Física',
    'SST (Seguridad y Salud en el Trabajo)',
    'Proyectos (PMO)',
    'Ingeniería',
    'Diseño',
    'Operaciones de Campo',
    'Call Center',
    'Soporte Técnico',
    'Relaciones Públicas',
    'Comercio Exterior',
    'Abastecimiento',
    'Gestión Documental',
    'Capacitación',
    'Innovación',
    'Experiencia de Usuario (UX/UI)'
];

const ensureDefaultDepartments = async () => {
    try {
        const [rows] = await promisePool.query(`SELECT nombre_departamento FROM departamentos`);
        const existing = new Set(rows.map((row) => row.nombre_departamento.trim().toUpperCase()));

        const missing = DEFAULT_DEPARTMENTS.filter(
            (department) => !existing.has(department.trim().toUpperCase())
        );

        for (const department of missing) {
            await promisePool.query(
                `INSERT INTO departamentos (nombre_departamento) VALUES (?)`,
                [department]
            );
        }

        if (missing.length > 0) {
            console.log(`✅ Departamentos base sincronizados: ${missing.length} agregados`);
        }
    } catch (error) {
        console.error('❌ Error asegurando departamentos base:', error.message);
        throw error;
    }
};

const ensureEmployeeSalaryColumn = async () => {
    try {
        const dbName = process.env.DB_NAME || 'sistema_nomina';
        const [columns] = await promisePool.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ?
               AND TABLE_NAME = 'empleados'
               AND COLUMN_NAME = 'sueldo'`,
            [dbName]
        );

        if (columns.length === 0) {
            await promisePool.query(
                `ALTER TABLE empleados
                 ADD COLUMN sueldo DECIMAL(12,2) NOT NULL DEFAULT 0.00
                 AFTER numero_identificacion`
            );
            console.log('✅ Columna empleados.sueldo creada automáticamente');
        }
    } catch (error) {
        console.error('❌ Error asegurando columna empleados.sueldo:', error.message);
        throw error;
    }
};



const ensurePayrollSupportTables = async () => {
    try {
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS horas_extra_nomina (
                id_hora_extra INT(11) NOT NULL AUTO_INCREMENT,
                id_nomina INT(11) NOT NULL,
                tipo_hora ENUM(
                    'EXTRA_DIURNA',
                    'EXTRA_NOCTURNA',
                    'EXTRA_DIURNA_DOMINICAL_FESTIVO',
                    'EXTRA_NOCTURNA_DOMINICAL_FESTIVO'
                ) NOT NULL,
                porcentaje_recargo DECIMAL(5,2) NOT NULL,
                horas DECIMAL(8,2) NOT NULL,
                valor_hora_base DECIMAL(12,2) NOT NULL,
                valor_hora_extra DECIMAL(12,2) NOT NULL,
                valor_total DECIMAL(12,2) NOT NULL,
                creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id_hora_extra),
                KEY idx_horas_extra_nomina_nomina (id_nomina),
                CONSTRAINT fk_horas_extra_nomina_nomina
                    FOREIGN KEY (id_nomina) REFERENCES nomina(id_nomina)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);

        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS reporte_nomina_mensual (
                id_reporte INT(11) NOT NULL AUTO_INCREMENT,
                anio SMALLINT NOT NULL,
                mes TINYINT NOT NULL,
                total_nominas INT(11) NOT NULL DEFAULT 0,
                total_devengado DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                total_deducciones DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                total_pagado DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                total_horas_extra DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                valor_horas_extra DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id_reporte),
                UNIQUE KEY uk_reporte_nomina_periodo (anio, mes)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);

        console.log('✅ Tablas de soporte de nómina (horas extra y reportes) verificadas');
    } catch (error) {
        console.error('❌ Error asegurando tablas de soporte de nómina:', error.message);
        throw error;
    }
};

const testConnection = async () => {
    try {
        const [rows] = await promisePool.query('SELECT 1 + 1 AS resultado')
        console.log('✅ Conexión a MySQL exitosa');
        console.log('📊 Base de datos:', process.env.DB_NAME);
        return true
    } catch (error) {
        console.error('❌ Error al conectar a MySQL:', error.message);
        return false;
    }
};

module.exports = {
    pool: promisePool,
    testConnection,
    ensureEmployeeSalaryColumn,
    ensureDefaultDepartments,
    ensurePayrollSupportTables
} 
