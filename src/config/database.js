const logger = require('../utils/logger');
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sistema_nomina',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

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
            logger.info(`Departamentos base sincronizados: ${missing.length} agregados`);
        }
    } catch (error) {
        logger.error('Error asegurando departamentos base:', error.message);
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
            logger.info('Columna empleados.sueldo creada automaticamente');
        }
    } catch (error) {
        logger.error('Error asegurando columna empleados.sueldo:', error.message);
        throw error;
    }
};

const ensureEmployeeWithdrawalColumn = async () => {
    try {
        const dbName = process.env.DB_NAME || 'sistema_nomina';
        const [columns] = await promisePool.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ?
               AND TABLE_NAME = 'empleados'
               AND COLUMN_NAME = 'fecha_retiro'`,
            [dbName]
        );

        if (columns.length === 0) {
            await promisePool.query(
                `ALTER TABLE empleados
                 ADD COLUMN fecha_retiro DATE NULL
                 AFTER activo`
            );
            logger.info('Columna empleados.fecha_retiro creada automaticamente');
        }
    } catch (error) {
        logger.error('Error asegurando columna empleados.fecha_retiro:', error.message);
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

        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS parametros_nomina (
                id_parametro INT(11) NOT NULL AUTO_INCREMENT,
                horas_extra_ordinaria_pct DECIMAL(5,2) NOT NULL DEFAULT 25.00,
                horas_extra_nocturna_pct DECIMAL(5,2) NOT NULL DEFAULT 75.00,
                horas_extra_festiva_pct DECIMAL(5,2) NOT NULL DEFAULT 100.00,
                horas_extra_festiva_nocturna_pct DECIMAL(5,2) NOT NULL DEFAULT 150.00,
                subsidio_transporte DECIMAL(12,2) NOT NULL DEFAULT 140606.00,
                tope_subsidio_transporte DECIMAL(12,2) NOT NULL DEFAULT 3501810.00,
                horas_semanales DECIMAL(6,2) NOT NULL DEFAULT 47.00,
                salud_empleado_pct DECIMAL(5,3) NOT NULL DEFAULT 4.000,
                salud_empresa_pct DECIMAL(5,3) NOT NULL DEFAULT 8.500,
                pension_empleado_pct DECIMAL(5,3) NOT NULL DEFAULT 4.000,
                pension_empresa_pct DECIMAL(5,3) NOT NULL DEFAULT 12.000,
                arl_empresa_pct DECIMAL(5,3) NOT NULL DEFAULT 0.522,
                sena_pct DECIMAL(5,3) NOT NULL DEFAULT 2.000,
                icbf_pct DECIMAL(5,3) NOT NULL DEFAULT 3.000,
                caja_compensacion_pct DECIMAL(5,3) NOT NULL DEFAULT 4.000,
                actualizado_por INT(11) NULL,
                creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id_parametro),
                CONSTRAINT fk_parametros_nomina_usuario
                    FOREIGN KEY (actualizado_por) REFERENCES usuarios(id_usuario)
                    ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);

        const [parameterRows] = await promisePool.query(
            `SELECT id_parametro FROM parametros_nomina LIMIT 1`
        );

        if (parameterRows.length === 0) {
            await promisePool.query(`
                INSERT INTO parametros_nomina (
                    horas_extra_ordinaria_pct,
                    horas_extra_nocturna_pct,
                    horas_extra_festiva_pct,
                    horas_extra_festiva_nocturna_pct,
                    subsidio_transporte,
                    tope_subsidio_transporte,
                    horas_semanales,
                    salud_empleado_pct,
                    salud_empresa_pct,
                    pension_empleado_pct,
                    pension_empresa_pct,
                    arl_empresa_pct,
                    sena_pct,
                    icbf_pct,
                    caja_compensacion_pct
                ) VALUES (25.00, 75.00, 100.00, 150.00, 140606.00, 3501810.00, 47.00, 4.000, 8.500, 4.000, 12.000, 0.522, 2.000, 3.000, 4.000)
            `);
            logger.info('Parametrizacion base de nomina inicializada');
        }

        const dbName = process.env.DB_NAME || 'sistema_nomina';
        const [topeColumn] = await promisePool.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ?
               AND TABLE_NAME = 'parametros_nomina'
               AND COLUMN_NAME = 'tope_subsidio_transporte'`,
            [dbName]
        );

        if (topeColumn.length === 0) {
            await promisePool.query(
                `ALTER TABLE parametros_nomina
                 ADD COLUMN tope_subsidio_transporte DECIMAL(12,2) NOT NULL DEFAULT 3501810.00
                 AFTER subsidio_transporte`
            );
            logger.info('Columna parametros_nomina.tope_subsidio_transporte creada automaticamente');
        }

        const [senaColumn] = await promisePool.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ?
               AND TABLE_NAME = 'parametros_nomina'
               AND COLUMN_NAME = 'sena_pct'`,
            [dbName]
        );

        if (senaColumn.length === 0) {
            await promisePool.query(
                `ALTER TABLE parametros_nomina
                 ADD COLUMN sena_pct DECIMAL(5,3) NOT NULL DEFAULT 2.000 AFTER arl_empresa_pct,
                 ADD COLUMN icbf_pct DECIMAL(5,3) NOT NULL DEFAULT 3.000 AFTER sena_pct,
                 ADD COLUMN caja_compensacion_pct DECIMAL(5,3) NOT NULL DEFAULT 4.000 AFTER icbf_pct`
            );
            logger.info('Columnas de parafiscales creadas automaticamente');
        }

        logger.info('Tablas de soporte de nomina (horas extra, reportes y parametros) verificadas');
    } catch (error) {
        logger.error('Error asegurando tablas de soporte de nomina:', error.message);
        throw error;
    }
};

const ensurePrestacionesLiquidacionTables = async () => {
    try {
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS prestaciones_devengadas (
                id_prestacion INT(11) NOT NULL AUTO_INCREMENT,
                id_empleado INT(11) NOT NULL,
                anio SMALLINT NOT NULL,
                mes TINYINT NOT NULL,
                salario_base DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                dias_acumulados INT(11) NOT NULL DEFAULT 0,
                prima_servicios DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                cesantias DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                intereses_cesantias DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                vacaciones DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id_prestacion),
                UNIQUE KEY uk_prestacion_empleado_periodo (id_empleado, anio, mes),
                CONSTRAINT fk_prestacion_empleado
                    FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);

        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS liquidaciones (
                id_liquidacion INT(11) NOT NULL AUTO_INCREMENT,
                id_empleado INT(11) NOT NULL,
                fecha_retiro DATE NOT NULL,
                motivo_retiro VARCHAR(255) NOT NULL DEFAULT '',
                salario_base DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                dias_trabajados_anio INT(11) NOT NULL DEFAULT 0,
                prima_servicios DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                cesantias DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                intereses_cesantias DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                vacaciones_no_disfrutadas DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                indemnizacion DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                total_liquidacion DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                estado ENUM('PENDIENTE', 'PAGADA', 'ANULADA') NOT NULL DEFAULT 'PENDIENTE',
                creado_por INT(11) NULL,
                creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id_liquidacion),
                KEY idx_liquidacion_empleado (id_empleado),
                KEY idx_liquidacion_estado (estado),
                CONSTRAINT fk_liquidacion_empleado
                    FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado)
                    ON DELETE CASCADE,
                CONSTRAINT fk_liquidacion_usuario
                    FOREIGN KEY (creado_por) REFERENCES usuarios(id_usuario)
                    ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);

        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS detalle_liquidacion (
                id_detalle INT(11) NOT NULL AUTO_INCREMENT,
                id_liquidacion INT(11) NOT NULL,
                concepto VARCHAR(150) NOT NULL,
                tipo ENUM('DEVENGADO', 'DEDUCCION') NOT NULL DEFAULT 'DEVENGADO',
                valor DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                PRIMARY KEY (id_detalle),
                KEY idx_detalle_liquidacion (id_liquidacion),
                CONSTRAINT fk_detalle_liquidacion
                    FOREIGN KEY (id_liquidacion) REFERENCES liquidaciones(id_liquidacion)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);

        logger.info('Tablas de prestaciones sociales y liquidacion verificadas');
    } catch (error) {
        logger.error('Error asegurando tablas de prestaciones/liquidacion:', error.message);
        throw error;
    }
};

const testConnection = async () => {
    try {
        await promisePool.query('SELECT 1 + 1 AS resultado');
        logger.info('Conexion a MySQL exitosa');
        logger.info('Base de datos:', process.env.DB_NAME);
        return true;
    } catch (error) {
        logger.error('Error al conectar a MySQL:', error.message);
        return false;
    }
};

const ensureRehiringParameters = async () => {
    try {
        const dbName = process.env.DB_NAME || 'sistema_nomina';
        const [mesesColumn] = await promisePool.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ?
               AND TABLE_NAME = 'parametros_nomina'
               AND COLUMN_NAME = 'meses_espera_recontratacion'`,
            [dbName]
        );

        if (mesesColumn.length === 0) {
            await promisePool.query(
                `ALTER TABLE parametros_nomina
                 ADD COLUMN meses_espera_recontratacion INT NOT NULL DEFAULT 0,
                 ADD COLUMN dias_espera_recontratacion INT NOT NULL DEFAULT 0`
            );
            logger.info('Columnas de espera de recontratacion creadas automaticamente');
        }
    } catch (error) {
        logger.error('Error asegurando columnas de espera de recontratacion:', error.message);
        throw error;
    }
};

const ensureJornadaLaboralColumn = async () => {
  try {
    const dbName = process.env.DB_NAME || 'sistema_nomina';
    const [columns] = await promisePool.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'empleados'
         AND COLUMN_NAME = 'jornada_laboral'`,
      [dbName]
    );

    if (columns.length === 0) {
      await promisePool.query(
        `ALTER TABLE empleados
         ADD COLUMN jornada_laboral ENUM('LUNES_VIERNES','LUNES_SABADO') NOT NULL DEFAULT 'LUNES_VIERNES'
         AFTER sueldo`
      );
      logger.info('Columna empleados.jornada_laboral creada automaticamente');
    }
  } catch (error) {
    logger.error('Error asegurando columna empleados.jornada_laboral:', error.message);
    throw error;
  }
};

const ensureGlobalJornadaLaboralColumn = async () => {
  try {
    const dbName = process.env.DB_NAME || 'sistema_nomina';
    const [columns] = await promisePool.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'parametros_nomina'
         AND COLUMN_NAME = 'jornada_laboral_defecto'`,
      [dbName]
    );

    if (columns.length === 0) {
      await promisePool.query(
        `ALTER TABLE parametros_nomina
         ADD COLUMN jornada_laboral_defecto ENUM('LUNES_VIERNES','LUNES_SABADO') NOT NULL DEFAULT 'LUNES_VIERNES'`
      );
      logger.info('Columna parametros_nomina.jornada_laboral_defecto creada automaticamente');
    }
  } catch (error) {
    logger.error('Error asegurando columna parametros_nomina.jornada_laboral_defecto:', error.message);
    throw error;
  }
};

const ensureNominaStatusColumn = async () => {
    try {
        const dbName = process.env.DB_NAME || 'sistema_nomina';
        const [columns] = await promisePool.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ?
               AND TABLE_NAME = 'nomina'
               AND COLUMN_NAME = 'estado'`,
            [dbName]
        );

        if (columns.length === 0) {
            await promisePool.query(
                `ALTER TABLE nomina
                 ADD COLUMN estado ENUM('PAGADA', 'ANULADA') NOT NULL DEFAULT 'PAGADA'`
            );
            logger.info('Columna nomina.estado creada automaticamente');
        }
    } catch (error) {
        logger.error('Error asegurando columna nomina.estado:', error.message);
        throw error;
    }
};

module.exports = {
    pool: promisePool,
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
};
