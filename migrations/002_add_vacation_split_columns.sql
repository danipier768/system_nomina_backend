-- =========================================================================
-- MIGRACIÓN: División de días de vacaciones
-- =========================================================================
-- Este script agrega las columnas dias_disfrutar y dias_dinero a la tabla solicitudes_laborales

ALTER TABLE solicitudes_laborales
ADD COLUMN dias_disfrutar DECIMAL(5,2) DEFAULT 0.00 AFTER dias_solicitados,
ADD COLUMN dias_dinero DECIMAL(5,2) DEFAULT 0.00 AFTER dias_disfrutar;

-- Para registros existentes de vacaciones, asumimos que todos los días son para disfrutar
UPDATE solicitudes_laborales
SET dias_disfrutar = dias_solicitados,
    dias_dinero = 0
WHERE tipo = 'VACACIONES';
