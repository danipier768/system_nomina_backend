-- ============================================
-- MIGRACIÓN 003: Prestaciones Sociales y Liquidación
-- ============================================

-- Tabla: prestaciones_devengadas
-- Acumula mes a mes las prestaciones sociales de cada empleado
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla: liquidaciones
-- Encabezado de cada liquidación por retiro
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla: detalle_liquidacion
-- Desglose de cada concepto en la liquidación
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
