# Soft Delete / Eliminación Lógica - Documentación

## 📋 Descripción General

Se ha implementado un sistema de **Soft Delete (Eliminación Lógica)** para empleados. En lugar de eliminar permanentemente los registros, se marcan como inactivos, permitiendo auditoría y recuperación si es necesario.

## 🔐 Control de Permisos

### ADMINISTRADOR
- ✅ **Desactivar empleado**: Marca el empleado como inactivo (soft delete)
- ✅ **Eliminar permanentemente**: Elimina completamente del sistema (hard delete)
- ✅ **Ver empleados activos e inactivos**: Acceso a todos

### RRHH
- ✅ **Desactivar empleado**: Marca el empleado como inactivo (soft delete)
- ❌ **Eliminar permanentemente**: NO permitido
- ✅ **Ver empleados activos**: Solo activos por defecto

## 📊 Cambios en la BD

### Tabla `empleados`
Se agregaron dos nuevas columnas:

```sql
ALTER TABLE empleados ADD COLUMN activo BOOLEAN DEFAULT TRUE;
ALTER TABLE empleados ADD COLUMN eliminado_en TIMESTAMP NULL;
```

- `activo`: TRUE = empleado activo, FALSE = desactivado
- `eliminado_en`: Fecha/hora de desactivación

## 🔄 Flujos de Trabajo

### 1. Desactivar Empleado (Soft Delete)
```bash
DELETE /employees/{id}
# Sin parámetros - por defecto hace soft delete
```

**Resultado:**
- Empleado marcado como `activo = FALSE`
- `eliminado_en` = ahora
- Datos se conservan en la BD
- Usuario asociado también se desactiva
- No afecta datos históricos (nómina, vacaciones, etc)

**Respuesta:**
```json
{
  "success": true,
  "message": "Empleado desactivado exitosamente. Sus datos se conservan en el sistema",
  "type": "soft_delete",
  "userRole": "ADMINISTRADOR"
}
```

---

### 2. Eliminar Permanentemente (Hard Delete)
```bash
DELETE /employees/{id}?permanent=true
# Solo ADMINISTRADOR puede hacerlo
```

**Restricciones:**
- ❌ No debe tener usuario asociado
- ❌ No debe tener registros de nómina
- ❌ Solo elimina si pasa estas validaciones

**Resultado:**
- Se elimina completamente de la BD
- Se eliminan datos de vacaciones
- No recuperable

**Respuesta:**
```json
{
  "success": true,
  "message": "Empleado eliminado permanentemente del sistema",
  "type": "hard_delete"
}
```

---

### 3. Error: Usuario No Autorizado
```json
{
  "success": false,
  "message": "Solo los administradores pueden eliminar permanentemente empleados"
}
```

## 📈 Impacto en Queries

### Listar Empleados (GET /employees)
```sql
WHERE activo = TRUE
```
- Solo muestra empleados activos
- ADMIN y RRHH ven lo mismo por seguridad

### Consultar Empleado (GET /employees/{id})
```sql
-- Para empleado regular:
WHERE id_empleado = ? AND activo = TRUE

-- Para ADMIN/RRHH:
WHERE id_empleado = ?
```
- Los empleados solo ven su perfil si está activo
- ADMIN/RRHH pueden ver perfiles inactivos

### Buscar Empleados (GET /employees/search?q=...)
```sql
WHERE activo = TRUE AND (nombres LIKE ? OR ...)
```
- Solo busca en empleados activos

## 🔍 Auditoría

### Cómo rastrear eliminaciones
```sql
SELECT 
  id_empleado,
  CONCAT(nombres, ' ', apellidos) as empleado,
  activo,
  eliminado_en
FROM empleados
WHERE activo = FALSE
ORDER BY eliminado_en DESC;
```

### Información preservada tras soft delete
- ✅ Historial de nómina
- ✅ Solicitudes de vacaciones
- ✅ Registros de horas extra
- ✅ Datos personales (para auditoría)
- ✅ Usuario asociado (desactivado también)

## ⚠️ Consideraciones

### Cuándo usar Soft Delete
1. ✅ Empleado se va o es despedido
2. ✅ Necesitas historial para impuestos/nómina
3. ✅ Cumplimiento normativo/auditoría

### Cuándo usar Hard Delete
1. ❌ Empleado nunca trabajó/registro erróneo
2. ❌ Sin historial de nómina
3. ❌ Sin usuario asociado
4. ❌ Requiere `?permanent=true`
5. ❌ Solo ADMINISTRADOR

## 📋 Flujo Recomendado para Eliminar Empleado

### Caso 1: Empleado con todo histórico (normal)
```
RRHH desactiva → Empleado marcado inactivo
(datos conservados para auditoría)
```

### Caso 2: Empleado sin nómina que no debería existir
```
1. ADMIN verifica sin registros de nómina
2. ADMIN verifica sin usuario asociado
3. ADMIN ejecuta DELETE ?permanent=true
4. Registro eliminado permanentemente
```

### Caso 3: Empleado con usuario pero queremos eliminar
```
1. Primero eliminar o reasignar usuario
2. Luego usar DELETE ?permanent=true (solo ADMIN)
3. O bien, solo desactivar (ADMIN/RRHH)
```

## 🔔 Errores Comunes

### Error: Usuario tiene usuario asociado
```json
{
  "success": false,
  "message": "No se puede eliminar. El empleado tiene un usuario asociado..."
}
```
**Solución**: Elimina o reasigna el usuario primero

### Error: Usuario tiene registros de nómina
```json
{
  "success": false,
  "message": "No se puede eliminar. El empleado tiene registros de nómina..."
}
```
**Solución**: Solo desactiva (soft delete), no elimines permanentemente

### Error: No is Administrador
```json
{
  "success": false,
  "message": "Solo los administradores pueden eliminar permanentemente empleados"
}
```
**Solución**: RRHH solo puede desactivar, no eliminar

## 📞 Resumen de Estados

| Estado | Visible | Puede Trabajar | RRHH puede hacer | ADMIN puede hacer |
|--------|---------|----------------|------------------|-------------------|
| Activo | ✅ | ✅ | Desactivar | Desactivar/Eliminar |
| Inactivo (Soft Delete) | ❌ Listas | ❌ | N/A | Ver/Eliminar Perm. |
| Eliminado (Hard Delete) | ❌ BD | ❌ | N/A | N/A (irrecuperable) |

---

**Última actualización**: 13 de abril de 2026
