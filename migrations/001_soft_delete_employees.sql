-- =========================================================================
-- MIGRACIÓN: Soft Delete para Empleados
-- =========================================================================
-- Este script agrega la funcionalidad de soft delete a la tabla empleados
-- Ejecutar una sola vez en la BD existente

-- Verificar si las columnas ya existen antes de crearlas
-- (para evitar errores si ya se ejecutó)

ALTER TABLE empleados 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE AFTER id_departamento,
ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMP NULL AFTER activo;

-- Actualizar empleados existentes (que no tienen fecha de eliminación)
UPDATE empleados 
SET activo = TRUE, eliminado_en = NULL 
WHERE eliminado_en IS NULL;

-- Crear índices para mejorar rendimiento en búsquedas
CREATE INDEX IF NOT EXISTS idx_empleados_activo ON empleados(activo);
CREATE INDEX IF NOT EXISTS idx_empleados_activo_eliminado ON empleados(activo, eliminado_en);

-- Guardar un comentario de auditoría
INSERT INTO sistema_nomina.information_schema.tables_info 
VALUES (
  'Migración Soft Delete aplicada el ' + DATE(NOW()),
  'Se agregaron columnas activo y eliminado_en a empleados'
);

-- Verificar cambios
SELECT 
  id_empleado,
  CONCAT(nombres, ' ', apellidos) as empleado,
  activo,
  eliminado_en
FROM empleados
LIMIT 5;
