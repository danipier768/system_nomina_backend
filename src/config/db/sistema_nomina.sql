CREATE DATABASE IF NOT EXISTS sistema_nomina;
USE sistema_nomina;

-- =====================
-- TABLAS PRINCIPALES
-- =====================

CREATE TABLE cargos (
  id_cargo INT AUTO_INCREMENT PRIMARY KEY,
  nombre_cargo VARCHAR(100) NOT NULL
);

CREATE TABLE departamentos (
  id_departamento INT AUTO_INCREMENT PRIMARY KEY,
  nombre_departamento VARCHAR(100) NOT NULL
);

CREATE TABLE roles (
  id_rol INT AUTO_INCREMENT PRIMARY KEY,
  nombre_rol ENUM('ADMINISTRADOR','RRHH','EMPLEADO') NOT NULL
);

-- =====================
-- EMPLEADOS
-- =====================

CREATE TABLE empleados (
  id_empleado INT AUTO_INCREMENT PRIMARY KEY,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  tipo_identificacion ENUM('CC','TI','CE','PASAPORTE') NOT NULL,
  numero_identificacion VARCHAR(50) UNIQUE NOT NULL,
  sueldo DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  fecha_nacimiento DATE NOT NULL,
  fecha_ingreso DATE NOT NULL,
  id_cargo INT,
  id_departamento INT,
  activo BOOLEAN DEFAULT TRUE,
  fecha_retiro DATE NULL,
  eliminado_en TIMESTAMP NULL,
  FOREIGN KEY (id_cargo) REFERENCES cargos(id_cargo),
  FOREIGN KEY (id_departamento) REFERENCES departamentos(id_departamento)
);

-- =====================
-- USUARIOS
-- =====================

CREATE TABLE usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE,
  activo TINYINT(1) DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  id_empleado INT,
  id_rol INT NOT NULL,
  FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado),
  FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
);

-- =====================
-- NOMINA
-- =====================

CREATE TABLE nomina (
  id_nomina INT AUTO_INCREMENT PRIMARY KEY,
  id_empleado INT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_corte DATE NOT NULL,
  tipo_pago ENUM('QUINCENAL','MENSUAL') NOT NULL,
  total_devengado DECIMAL(12,2) DEFAULT 0.00,
  total_deducciones DECIMAL(12,2) DEFAULT 0.00,
  total_pagar DECIMAL(12,2) GENERATED ALWAYS AS (total_devengado - total_deducciones) STORED,
  FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado)
);

CREATE TABLE detalle_nomina (
  id_detalle INT AUTO_INCREMENT PRIMARY KEY,
  id_nomina INT,
  concepto VARCHAR(100),
  valor DECIMAL(12,2),
  FOREIGN KEY (id_nomina) REFERENCES nomina(id_nomina)
);

CREATE TABLE horas_extra_nomina (
  id_hora_extra INT AUTO_INCREMENT PRIMARY KEY,
  id_nomina INT NOT NULL,
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
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_nomina) REFERENCES nomina(id_nomina) ON DELETE CASCADE
);

CREATE TABLE parametros_nomina (
  id_parametro INT AUTO_INCREMENT PRIMARY KEY,
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
  actualizado_por INT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (actualizado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- =====================
-- VACACIONES
-- =====================

CREATE TABLE vacaciones_saldos (
  id_saldo INT AUTO_INCREMENT PRIMARY KEY,
  id_empleado INT NOT NULL,
  periodo_anio INT NOT NULL,
  dias_ganados DECIMAL(5,2) DEFAULT 0.00,
  dias_disfrutados DECIMAL(5,2) DEFAULT 0.00,
  dias_pendientes DECIMAL(5,2) DEFAULT 0.00,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (id_empleado, periodo_anio),
  FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado)
);

-- =====================
-- SOLICITUDES
-- =====================

CREATE TABLE solicitudes_laborales (
  id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
  id_empleado INT NOT NULL,
  tipo ENUM('VACACIONES','PERMISO','INCAPACIDAD','LICENCIA') NOT NULL,
  sub_tipo VARCHAR(50),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_solicitados DECIMAL(5,2),
  horas_solicitadas DECIMAL(5,2),
  es_remunerado TINYINT(1) DEFAULT 1,
  porcentaje_pago DECIMAL(5,2) DEFAULT 100,
  origen_novedad ENUM('COMUN','LABORAL'),
  estado ENUM('PENDIENTE','APROBADA','RECHAZADA','CANCELADA') DEFAULT 'PENDIENTE',
  comentario_empleado TEXT,
  comentario_aprobador TEXT,
  documento_soporte VARCHAR(255),
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_respuesta TIMESTAMP NULL,
  aprobado_por INT,
  FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado),
  FOREIGN KEY (aprobado_por) REFERENCES usuarios(id_usuario)
);

CREATE INDEX idx_solicitudes_estado_empleado_fechas
  ON solicitudes_laborales (id_empleado, estado, fecha_inicio, fecha_fin);

-- Nota: columna pendiente_liquidacion fue eliminada del diseño actual
-- CREATE INDEX idx_solicitudes_pendiente_liquidacion
--   ON solicitudes_laborales (pendiente_liquidacion, id_empleado);

CREATE INDEX idx_solicitudes_tipo_estado_fecha
  ON solicitudes_laborales (tipo, estado, fecha_solicitud);

CREATE TABLE nomina_novedades_aplicadas (
  id_nomina_novedad INT AUTO_INCREMENT PRIMARY KEY,
  id_nomina INT NOT NULL,
  id_solicitud INT NOT NULL,
  categoria ENUM('DEVENGADO','DEDUCCION','INFORMATIVA') NOT NULL DEFAULT 'INFORMATIVA',
  concepto VARCHAR(120) NOT NULL,
  cantidad DECIMAL(10,2) DEFAULT 0.00,
  unidad ENUM('DIAS','HORAS') NOT NULL DEFAULT 'DIAS',
  porcentaje_aplicado DECIMAL(5,2) DEFAULT 0.00,
  valor_aplicado DECIMAL(14,2) DEFAULT 0.00,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_nomina_solicitud (id_nomina, id_solicitud),
  FOREIGN KEY (id_nomina) REFERENCES nomina(id_nomina) ON DELETE CASCADE,
  FOREIGN KEY (id_solicitud) REFERENCES solicitudes_laborales(id_solicitud) ON DELETE CASCADE
);

-- =====================
-- REPORTES
-- =====================

CREATE TABLE reporte_nomina_mensual (
  id_reporte INT AUTO_INCREMENT PRIMARY KEY,
  anio SMALLINT NOT NULL,
  mes TINYINT NOT NULL,
  total_nominas INT DEFAULT 0,
  total_devengado DECIMAL(14,2) DEFAULT 0.00,
  total_deducciones DECIMAL(14,2) DEFAULT 0.00,
  total_pagado DECIMAL(14,2) DEFAULT 0.00,
  total_horas_extra DECIMAL(12,2) DEFAULT 0.00,
  valor_horas_extra DECIMAL(14,2) DEFAULT 0.00,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (anio, mes)
);

-- =====================
-- TOKENS
-- =====================

CREATE TABLE password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expira_en DATETIME NOT NULL,
  usado TINYINT(1) DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- =====================
-- INSERTS
-- =====================

INSERT INTO cargos (nombre_cargo) VALUES
('Analista'),('Desarrollador'),('Soporte Técnico'),('Gerente'),('Asistente');

INSERT INTO roles (nombre_rol) VALUES
('ADMINISTRADOR'),('RRHH'),('EMPLEADO');


-- =====================
-- CARGOS
-- =====================
INSERT INTO cargos (nombre_cargo) VALUES
('Analista'),
('Desarrollador'),
('Soporte Técnico'),
('Gerente'),
('Asistente');

-- =====================
-- DEPARTAMENTOS
-- =====================
INSERT INTO departamentos (nombre_departamento) VALUES
('Gerencia General'),
('Administración'),
('Recursos Humanos'),
('Finanzas'),
('Recursos Humanos (Gestión Humana)'),
('Contabilidad'),
('Tesorería'),
('Compras'),
('Ventas'),
('Comercial'),
('Mercadeo (Marketing)'),
('Servicio al Cliente'),
('Operaciones'),
('Producción'),
('Logística'),
('Almacén / Bodega'),
('Tecnología de la Información (TI / Sistemas)'),
('Desarrollo de Software'),
('Infraestructura Tecnológica'),
('Seguridad de la Información'),
('Calidad'),
('Auditoría Interna'),
('Jurídica / Legal'),
('Planeación / Estrategia'),
('Investigación y Desarrollo (I+D)'),
('Mantenimiento'),
('Seguridad Física'),
('SST (Seguridad y Salud en el Trabajo)'),
('Proyectos (PMO)'),
('Ingeniería'),
('Diseño'),
('Operaciones de Campo'),
('Call Center'),
('Soporte Técnico'),
('Relaciones Públicas'),
('Comercio Exterior'),
('Abastecimiento'),
('Gestión Documental'),
('Capacitación'),
('Innovación'),
('Experiencia de Usuario (UX/UI)');

-- =====================
-- ROLES
-- =====================
INSERT INTO roles (nombre_rol) VALUES
('ADMINISTRADOR'),
('RRHH'),
('EMPLEADO');

-- =====================
-- EMPLEADOS
-- =====================
INSERT INTO empleados 
(nombres, apellidos, tipo_identificacion, numero_identificacion, sueldo, fecha_nacimiento, fecha_ingreso, id_cargo, id_departamento) 
VALUES
('Daniel', 'Perez Rojas', 'CC', '1090273907', 2100000.00, '2006-08-10', '2024-11-18', 2, 3),
('Karolin Xiomara', 'Árevalo Vergel', 'CC', '1072646023', 2500000.00, '2006-01-03', '2026-04-06', 1, 21);

-- =====================
-- USUARIOS
-- =====================
INSERT INTO usuarios 
(username, password, email, activo, id_empleado, id_rol) 
VALUES
('danipier', '$2b$10$12rw/TV8HII3u6E8C0UY1.tE61LxXIOpjyo3y8XU2zYL9xAEN6aZG', 'danipier768@gmail.com', 1, 1, 1),
('karolinxio', '$2b$10$SgQ.l2N0LMKldoc7Qog0EepvJsPFk/Mc8OzNMEQXYsovpXeJr6.ae', 'xiomaraarevalo2006@gmail.com', 1, 2, 3);

-- =====================
-- NOMINA
-- =====================
INSERT INTO nomina 
(id_empleado, fecha_inicio, fecha_corte, tipo_pago, total_devengado, total_deducciones) 
VALUES
(1, '2026-01-01', '2026-01-15', 'QUINCENAL', 1200000.00, 200000.00),
(2, '2026-04-01', '2026-04-15', 'MENSUAL', 1499095.00, 100000.00);

-- =====================
-- DETALLE NOMINA
-- =====================
INSERT INTO detalle_nomina (id_nomina, concepto, valor) VALUES
(2, 'Pago base (15 días)', 1250000.00),
(2, 'Subsidio de transporte', 249095.00),
(2, 'Salud 4%', 50000.00),
(2, 'Pensión 4%', 50000.00);

-- =====================
-- HORAS EXTRA
-- =====================
INSERT INTO horas_extra_nomina 
(id_nomina, tipo_hora, porcentaje_recargo, horas, valor_hora_base, valor_hora_extra, valor_total) 
VALUES
(1, 'EXTRA_DIURNA', 25.00, 5.00, 10000.00, 12500.00, 62500.00);

-- =====================
-- PARAMETROS NOMINA
-- =====================
INSERT INTO parametros_nomina
(horas_extra_ordinaria_pct, horas_extra_nocturna_pct, horas_extra_festiva_pct, horas_extra_festiva_nocturna_pct, subsidio_transporte, horas_semanales, salud_empleado_pct, salud_empresa_pct, pension_empleado_pct, pension_empresa_pct, arl_empresa_pct, actualizado_por)
VALUES
(25.00, 75.00, 100.00, 150.00, 140606.00, 47.00, 4.000, 8.500, 4.000, 12.000, 0.522, 1);

-- =====================
-- VACACIONES
-- =====================
INSERT INTO vacaciones_saldos 
(id_empleado, periodo_anio, dias_ganados, dias_disfrutados, dias_pendientes) 
VALUES
(1, 2026, 15.00, 10.00, 5.00),
(2, 2026, 15.00, 0.00, 15.00);

-- =====================
-- SOLICITUDES LABORALES
-- =====================
INSERT INTO solicitudes_laborales 
(id_empleado, tipo, sub_tipo, fecha_inicio, fecha_fin, dias_solicitados, es_remunerado, porcentaje_pago, estado) 
VALUES
(1, 'VACACIONES', NULL, '2026-02-01', '2026-02-10', 10.00, 1, 100.00, 'APROBADA'),
(2, 'VACACIONES', 'Viaje familiar', '2026-06-16', '2026-06-30', 15.00, 1, 100.00, 'PENDIENTE');

-- =====================
-- REPORTE NOMINA
-- =====================
INSERT INTO reporte_nomina_mensual 
(anio, mes, total_nominas, total_devengado, total_deducciones, total_pagado) 
VALUES
(2026, 4, 1, 1499095.00, 100000.00, 1399095.00);
-- =====================
-- TOKENS
-- =====================

INSERT INTO password_reset_tokens 
(id_usuario, token, expira_en, usado) 
VALUES
(1, '3', '2026-04-09 19:30:31', 1);
