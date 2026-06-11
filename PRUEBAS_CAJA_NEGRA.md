# Pruebas de Caja Negra - Especificación de Casos de Test

## Modulos: Reportes, Permisos/Novedades, Carga de Archivos, Prestacion de Servicios y Liquidaciones

---

## 1. MODULO REPORTES (Nomina)

### 1.1 Requerimientos Funcionales

| ID | Requerimiento | Descripcion |
|----|--------------|-------------|
| RF-RPT-01 | Consultar resumen de nominas | El sistema debe permitir consultar un resumen de nominas filtrando por año (2000-2100), mes (1-12) y empleado (opcional). |
| RF-RPT-02 | Visualizar totales agregados | El resumen debe mostrar: total nominas, total devengado, total deducciones, total pagado, total horas extra y valor horas extra. |
| RF-RPT-03 | Desglose por tipo de hora extra | Debe mostrar el desglose de HEO, HEF, HEN, HEFN con sus respectivos valores. |
| RF-RPT-04 | Exportar a Excel | El sistema debe permitir exportar el reporte a formato Excel (.xlsx) solo para ADMIN/RRHH. |
| RF-RPT-05 | Exportar a PDF | El sistema debe permitir exportar el reporte a formato PDF solo para ADMIN/RRHH. |
| RF-RPT-06 | Reporte individual de nomina | Debe permitir consultar el detalle completo de una nomina individual por ID. |
| RF-RPT-07 | PDF individual de nomina | Debe permitir descargar el PDF de una nomina individual. |
| RF-RPT-08 | Filtro por empleado | ADMIN/RRHH pueden filtrar por cualquier empleado; EMPLEADO solo ve sus propios datos. |
| RF-RPT-09 | Validacion de parametros | El sistema debe validar que año este entre 2000-2100 y mes entre 1-12. |

### 1.2 Aspectos a Evaluar (Pruebas de Caja Negra)

#### 1.2.1 Consulta de Reportes - `GET /api/nomina/reportes`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-RPT-01 | Consulta sin filtros (admin) | Token ADMIN, sin query params | 200 OK, resumen con datos del año/mes actual |
| CP-RPT-02 | Consulta con año y mes validos | anio=2026, mes=5 | 200 OK, datos filtrados correctamente |
| CP-RPT-03 | Consulta año invalido (< 2000) | anio=1999 | 400 Bad Request, error de validacion |
| CP-RPT-04 | Consulta año invalido (> 2100) | anio=2101 | 400 Bad Request, error de validacion |
| CP-RPT-05 | Consulta mes invalido (0) | mes=0 | 400 Bad Request, error de validacion |
| CP-RPT-06 | Consulta mes invalido (13) | mes=13 | 400 Bad Request, error de validacion |
| CP-RPT-07 | Consulta mes no numerico | mes="abc" | 400 Bad Request, error de validacion |
| CP-RPT-08 | Consulta con id_empleado existente (admin) | id_empleado=1 | 200 OK, datos del empleado especificado |
| CP-RPT-09 | Consulta con id_empleado inexistente | id_empleado=99999 | 200 OK, resumen vacio o 0 registros |
| CP-RPT-10 | Consulta como EMPLEADO filtrando otro empleado | Token EMPLEADO, id_empleado=2 | 403 Forbidden o filtra solo sus datos |
| CP-RPT-11 | Consulta como EMPLEADO sin id_empleado | Token EMPLEADO | 200 OK, solo sus nominas |
| CP-RPT-12 | Consulta sin token | Sin Authorization header | 401 Unauthorized |
| CP-RPT-13 | Consulta con token invalido | Token basura | 401 Unauthorized |
| CP-RPT-14 | Año con datos existentes | anio=2026 | 200 OK con data no vacia |
| CP-RPT-15 | Año sin datos | anio=2020 (si no hay datos) | 200 OK con data.resumen.totalNominas = 0 |

#### 1.2.2 Exportacion Excel - `GET /api/nomina/reportes/export/excel`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-RPT-16 | Exportar Excel como ADMIN | Token ADMIN, anio=2026 | 200 OK, archivo .xlsx descargable |
| CP-RPT-17 | Exportar Excel como RRHH | Token RRHH, anio=2026 | 200 OK, archivo .xlsx descargable |
| CP-RPT-18 | Exportar Excel como EMPLEADO | Token EMPLEADO | 403 Forbidden |
| CP-RPT-19 | Exportar Excel sin datos | anio=2020 (sin datos) | 200 OK, archivo .xlsx vacio o con estructura |

#### 1.2.3 Exportacion PDF - `GET /api/nomina/reportes/export/pdf`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-RPT-20 | Exportar PDF como ADMIN | Token ADMIN, anio=2026 | 200 OK, archivo .pdf descargable |
| CP-RPT-21 | Exportar PDF como EMPLEADO | Token EMPLEADO | 403 Forbidden |
| CP-RPT-22 | Exportar PDF con filtro empleado | id_empleado=1 | 200 OK, PDF con datos del empleado |

#### 1.2.4 Detalle de Nomina Individual - `GET /api/nomina/:id_nomina`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-RPT-23 | Consultar nomina existente (admin) | id_nomina=1 | 200 OK, detalle completo + horas extra |
| CP-RPT-24 | Consultar nomina inexistente | id_nomina=99999 | 404 Not Found |
| CP-RPT-25 | Consultar nomina de otro empleado (EMPLEADO) | id_nomina de otro empleado | 403 Forbidden |
| CP-RPT-26 | Consultar nomina propia (EMPLEADO) | id_nomina propia | 200 OK |
| CP-RPT-27 | Consultar nomina con id no numerico | id_nomina="abc" | 400 Bad Request o 404 |

#### 1.2.5 PDF Individual - `GET /api/nomina/:id_nomina/pdf`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-RPT-28 | Descargar PDF de nomina propia (EMPLEADO) | id_nomina propia | 200 OK, PDF descargable |
| CP-RPT-29 | Descargar PDF de nomina de otro (EMPLEADO) | id_nomina de otro | 403 Forbidden |
| CP-RPT-30 | Descargar PDF de nomina inexistente | id_nomina=99999 | 404 Not Found |

---

## 2. MODULO PERMISOS / NOVEDADES (Solicitudes Laborales)

### 2.1 Requerimientos Funcionales

| ID | Requerimiento | Descripcion |
|----|--------------|-------------|
| RF-PER-01 | Crear solicitud de vacaciones | El sistema debe permitir crear solicitudes de vacaciones con fechas, dias a disfrutar, dias en dinero y comentario. |
| RF-PER-02 | Crear solicitud de permiso | El sistema debe permitir crear solicitudes de permiso con tipo (remunerado/no remunerado) y horas solicitadas. |
| RF-PER-03 | Crear solicitud de incapacidad | El sistema debe permitir crear solicitudes de incapacidad con origen (comun/laboral) y documento soporte. |
| RF-PER-04 | Crear solicitud de licencia | El sistema debe permitir crear solicitudes de licencia con subtipo (maternidad, paternidad, luto, calamidad, etc.) y si es remunerada. |
| RF-PER-05 | Validar saldo de vacaciones | Al crear vacaciones, el sistema debe validar que el empleado tenga saldo suficiente de dias pendientes. |
| RF-PER-06 | Validar bloque minimo de 6 dias | La primera solicitud de vacaciones del periodo debe tener al menos 6 dias habiles de disfrute. |
| RF-PER-07 | Validar tope de 15 dias | El total entre dias a disfrutar y dias en dinero no debe exceder 15. |
| RF-PER-08 | Validar tope de 7 dias en dinero | Los dias en dinero no deben exceder 7. |
| RF-PER-09 | Validar no solapamiento | No deben existir dos solicitudes de vacaciones pendientes o aprobadas con rangos de fechas solapados. |
| RF-PER-10 | Aprobar solicitud | ADMIN/RRHH pueden aprobar solicitudes pendientes; las vacaciones descuentan del saldo. |
| RF-PER-11 | Rechazar solicitud | ADMIN/RRHH pueden rechazar solicitudes sin impacto en saldo. |
| RF-PER-12 | Cancelar solicitud | ADMIN/RRHH pueden cancelar solicitudes; si estaba aprobada, se devuelve el saldo de vacaciones. |
| RF-PER-13 | Consultar mis solicitudes | EMPLEADO puede ver solo sus solicitudes, filtrable por tipo. |
| RF-PER-14 | Consultar todas las solicitudes | ADMIN/RRHH pueden ver todas las solicitudes, filtrable por tipo, estado y empleado. |
| RF-PER-15 | Consultar saldo de vacaciones | El sistema debe mostrar los dias pendientes, disfrutados y totales de vacaciones por año. |
| RF-PER-16 | Eliminar solicitud | EMPLEADO puede eliminar solicitudes propias en estado PENDIENTE; ADMIN/RRHH pueden eliminar cualquier solicitud. |
| RF-PER-17 | Adjuntar documento soporte | Al crear solicitudes de incapacidad se puede adjuntar un archivo de soporte (PDF, PNG, JPG, max 5MB). |

### 2.2 Estados y Transiciones

```
PENDIENTE --> APROBADA  (descuenta saldo vacaciones si aplica)
PENDIENTE --> RECHAZADA (sin impacto en saldo)
PENDIENTE --> CANCELADA (sin impacto en saldo)
APROBADA  --> CANCELADA (devuelve saldo vacaciones)
PENDIENTE --> (eliminacion directa)
APROBADA  --> (eliminacion directa con devolucion de saldo)
```

### 2.3 Aspectos a Evaluar (Pruebas de Caja Negra)

#### 2.3.1 Creacion de Vacaciones - `POST /api/solicitudes/vacaciones`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-PER-01 | Vacaciones validas con saldo suficiente | fecha_inicio y fecha_fin validas, dias_disfrutar <= saldo | 201 Created |
| CP-PER-02 | Vacaciones sin saldo suficiente | dias_solicitados > saldo_pendiente | 400 Bad Request, error de saldo insuficiente |
| CP-PER-03 | Vacaciones exceden 15 dias totales | dias_disfrutar + dias_dinero > 15 | 400 Bad Request, error de tope |
| CP-PER-04 | Vacaciones con dias en dinero > 7 | dias_dinero = 8 | 400 Bad Request, error de tope |
| CP-PER-05 | Vacaciones sin bloque minimo de 6 dias | Primeras vacaciones del periodo con < 6 dias habiles | 400 Bad Request, error de bloque minimo |
| CP-PER-06 | Vacaciones con bloque minimo cumplido | Primeras vacaciones con >= 6 dias habiles | 201 Created |
| CP-PER-07 | Vacaciones solapadas con otra pendiente | Rango de fechas solapado con solicitud pendiente existente | 400 Bad Request, error de solapamiento |
| CP-PER-08 | Vacaciones solapadas con otra aprobada | Rango de fechas solapado con solicitud aprobada existente | 400 Bad Request, error de solapamiento |
| CP-PER-09 | Vacaciones sin solapamiento | Rango de fechas sin conflicto | 201 Created |
| CP-PER-10 | Vacaciones con fecha_fin anterior a fecha_inicio | fecha_inicio = 2026-06-15, fecha_fin = 2026-06-01 | 400 Bad Request |
| CP-PER-11 | Vacaciones como EMPLEADO sin id_empleado | Token EMPLEADO, body sin id_empleado | 201 Created, usa ID del JWT |
| CP-PER-12 | Vacaciones como ADMIN con id_empleado de otro | Token ADMIN, id_empleado=5 | 201 Created |
| CP-PER-13 | Vacaciones con comentario opcional | Con comentario_empleado | 201 Created, comentario guardado |
| CP-PER-14 | Vacaciones con archivo soporte | Con support_file valido | 201 Created |
| CP-PER-15 | Crear vacaciones sin token | Sin Auth header | 401 Unauthorized |

#### 2.3.2 Creacion de Permisos - `POST /api/solicitudes/permisos`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-PER-16 | Permiso remunerado valido | es_remunerado=SI, horas_solicitadas=8 | 201 Created |
| CP-PER-17 | Permiso no remunerado valido | es_remunerado=NO, horas_solicitadas=4 | 201 Created |
| CP-PER-18 | Permiso con horas_solicitadas = 0 | horas_solicitadas=0 | 400 Bad Request |
| CP-PER-19 | Permiso con horas_solicitadas negativas | horas_solicitadas=-1 | 400 Bad Request |
| CP-PER-20 | Permiso con horas excesivas | horas_solicitadas=1000 | 400 Bad Request |
| CP-PER-21 | Permiso con fechas invalidas | fecha_fin < fecha_inicio | 400 Bad Request |

#### 2.3.3 Creacion de Incapacidades - `POST /api/solicitudes/incapacidades`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-PER-22 | Incapacidad origen comun valida | origen_novedad=COMUN | 201 Created |
| CP-PER-23 | Incapacidad origen laboral valida | origen_novedad=LABORAL | 201 Created |
| CP-PER-24 | Incapacidad con origen invalido | origen_novedad=OTRO | 400 Bad Request |
| CP-PER-25 | Incapacidad con archivo soporte PDF | support_file.type=application/pdf, < 5MB | 201 Created |
| CP-PER-26 | Incapacidad con archivo soporte PNG | support_file.type=image/png, < 5MB | 201 Created |
| CP-PER-27 | Incapacidad con archivo soporte JPG | support_file.type=image/jpeg, < 5MB | 201 Created |
| CP-PER-28 | Incapacidad con tipo de archivo no soportado | support_file.type=image/gif | 400 Bad Request, error de tipo no permitido |
| CP-PER-29 | Incapacidad con archivo > 5MB | Archivo de 6MB | 400 Bad Request, error de tamanio excedido |
| CP-PER-30 | Incapacidad sin origen_novedad | origen_novedad ausente | 400 Bad Request |

#### 2.3.4 Creacion de Licencias - `POST /api/solicitudes/licencias`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-PER-31 | Licencia de maternidad | sub_tipo=MATERNIDAD | 201 Created |
| CP-PER-32 | Licencia de paternidad | sub_tipo=PATERNIDAD | 201 Created |
| CP-PER-33 | Licencia de luto | sub_tipo=LUTO | 201 Created |
| CP-PER-34 | Licencia de calamidad domestica | sub_tipo=CALAMIDAD | 201 Created |
| CP-PER-35 | Licencia no remunerada | sub_tipo=OTRO, es_remunerado=NO | 201 Created |
| CP-PER-36 | Licencia con sub_tipo invalido | sub_tipo=INEXISTENTE | 400 Bad Request |

#### 2.3.5 Aprobacion/Rechazo/Cancelacion

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-PER-37 | Aprobar vacacion pendiente | PATCH /vacaciones/:id/aprobar, token ADMIN | 200 OK, saldo descontado |
| CP-PER-38 | Aprobar vacacion por EMPLEADO | PATCH /vacaciones/:id/aprobar, token EMPLEADO | 403 Forbidden |
| CP-PER-39 | Rechazar vacacion pendiente | PATCH /vacaciones/:id/rechazar, token RRHH | 200 OK, estado RECHAZADA |
| CP-PER-40 | Cancelar vacacion aprobada | PATCH /vacaciones/:id/cancelar | 200 OK, saldo restaurado |
| CP-PER-41 | Cancelar vacacion pendiente | PATCH /vacaciones/:id/cancelar | 200 OK, estado CANCELADA |
| CP-PER-42 | Aprobar solicitud inexistente | id_solicitud=99999 | 404 Not Found |
| CP-PER-43 | Aprobar solicitud ya aprobada | Solicitud ya en estado APROBADA | 400 Bad Request, error de estado invalido |
| CP-PER-44 | Rechazar solicitud ya rechazada | Solicitud ya en estado RECHAZADA | 400 Bad Request |
| CP-PER-45 | Aprobar permiso con comentario | comentario_aprobador="Aprobado" | 200 OK, comentario guardado |

#### 2.3.6 Consulta de Solicitudes

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-PER-46 | Ver mis solicitudes (EMPLEADO) | GET /mis-solicitudes, token EMPLEADO | 200 OK, solo solicitudes del empleado |
| CP-PER-47 | Ver mis solicitudes filtrado por tipo | ?tipo=VACACIONES | 200 OK, solo vacaciones |
| CP-PER-48 | Ver todas las solicitudes (ADMIN) | GET /solicitudes | 200 OK, todas las solicitudes |
| CP-PER-49 | Ver todas filtrado por estado | ?estado=PENDIENTE | 200 OK, solo pendientes |
| CP-PER-50 | Ver todas filtrado por empleado | ?id_empleado=1 | 200 OK, solo de ese empleado |
| CP-PER-51 | Ver todas como EMPLEADO | GET /solicitudes sin ser ADMIN/RRHH | 403 Forbidden |
| CP-PER-52 | Consultar saldo de vacaciones | GET /vacaciones/saldo/1 | 200 OK, saldo con dias pendientes y disfrutados |

#### 2.3.7 Eliminacion de Solicitudes

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-PER-53 | Eliminar solicitud pendiente propia (EMPLEADO) | DELETE /:id, solicitud propia PENDIENTE | 200 OK, eliminada |
| CP-PER-54 | Eliminar solicitud aprobada propia (EMPLEADO) | DELETE /:id, solicitud propia APROBADA | 403 Forbidden |
| CP-PER-55 | Eliminar solicitud de otro (EMPLEADO) | DELETE /:id, solicitud de otro empleado | 403 Forbidden |
| CP-PER-56 | Eliminar solicitud como ADMIN | DELETE /:id, token ADMIN | 200 OK |
| CP-PER-57 | Eliminar solicitud aprobada (ADMIN) | DELETE /:id, solicitud APROBADA | 200 OK, saldo restaurado |
| CP-PER-58 | Eliminar solicitud inexistente | DELETE /:id, id=99999 | 404 Not Found |

---

## 3. MODULO CARGA DE ARCHIVOS / SOPORTES

### 3.1 Requerimientos Funcionales

| ID | Requerimiento | Descripcion |
|----|--------------|-------------|
| RF-ARC-01 | Adjuntar archivo a solicitud | El sistema debe permitir adjuntar un archivo como documento soporte al crear una solicitud laboral. |
| RF-ARC-02 | Formatos permitidos | Solo se permiten archivos PDF, PNG y JPG/JPEG. |
| RF-ARC-03 | Tamanio maximo | El archivo no debe superar los 5 MB. |
| RF-ARC-04 | Codificacion Base64 | El archivo se envia como string Base64 en el JSON del body. |
| RF-ARC-05 | Almacenamiento persistente | El archivo debe guardarse en el servidor en uploads/solicitudes/ con nombre unico. |
| RF-ARC-06 | Ruta de acceso | El sistema debe almacenar la ruta del archivo en la base de datos para acceso posterior. |
| RF-ARC-07 | Limite global de body | El servidor acepta hasta 20MB de payload JSON. |
| RF-ARC-08 | Archivo opcional | El documento soporte es opcional en la creacion de solicitudes. |

### 3.2 Aspectos a Evaluar (Pruebas de Caja Negra)

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-ARC-01 | Subir archivo PDF valido (< 5MB) | support_file.type=application/pdf, content valido | 201 Created, ruta guardada |
| CP-ARC-02 | Subir archivo PNG valido (< 5MB) | support_file.type=image/png, content valido | 201 Created, ruta guardada |
| CP-ARC-03 | Subir archivo JPG valido (< 5MB) | support_file.type=image/jpeg, content valido | 201 Created, ruta guardada |
| CP-ARC-04 | Subir archivo tipo no permitido | support_file.type=image/gif | 400 Bad Request |
| CP-ARC-05 | Subir archivo tipo no permitido (text/plain) | support_file.type=text/plain | 400 Bad Request |
| CP-ARC-06 | Subir archivo tipo no permitido (application/msword) | support_file.type=application/msword | 400 Bad Request |
| CP-ARC-07 | Subir archivo > 5MB | content de 6MB | 400 Bad Request, error de tamanio |
| CP-ARC-08 | Subir archivo de tamanio exacto 5MB | content de 5MB exactos | 201 Created (limite exacto) |
| CP-ARC-09 | Subir archivo de 0 bytes | content vacio | 400 Bad Request o 201 Created (depende de logica) |
| CP-ARC-10 | Crear solicitud sin archivo soporte | Sin support_file en body | 201 Created, documento_soporte = null |
| CP-ARC-11 | Subir archivo con content Base64 invalido | content = "no-es-base64-valido" | 400 Bad Request |
| CP-ARC-12 | Subir archivo con nombre de archivo largo | name con 500 caracteres | 201 Created o 400 dependiendo de validacion |
| CP-ARC-13 | Subir archivo con tipo inconsistente | type=image/png pero content es PDF | Depende de validacion del contenido real |
| CP-ARC-14 | Enviar body > 20MB (limite servidor) | Payload JSON de 25MB | 413 Payload Too Large |
| CP-ARC-15 | Verificar que el archivo se guarda en disco | Subida exitosa | Archivo existe en uploads/solicitudes/ |
| CP-ARC-16 | Verificar nombre unico de archivo | Dos subidas con mismo nombre | Nombres diferentes en disco (timestamp) |

---

## 4. MODULO PRESTACION DE SERVICIOS (Prestaciones Sociales)

### 4.1 Requerimientos Funcionales

| ID | Requerimiento | Descripcion |
|----|--------------|-------------|
| RF-PSV-01 | Consultar prestaciones devengadas | El sistema debe permitir consultar las prestaciones sociales acumuladas por empleado, año y mes. |
| RF-PSV-02 | Calcular prima de servicios | Debe calcular la prima como (salario_base * dias_en_mes) * 1/12 / 30. |
| RF-PSV-03 | Calcular cesantias | Debe calcular las cesantias como (salario_base * dias_en_mes) * 1/12 / 30. |
| RF-PSV-04 | Calcular intereses sobre cesantias | Debe calcular intereses como cesantias * 0.12 * (dias_en_mes / 360). |
| RF-PSV-05 | Calcular vacaciones (prestacion) | Debe calcular vacaciones como (salario_base * dias_en_mes) * 1/24 / 15. |
| RF-PSV-06 | Acumular prestaciones individual | ADMIN/RRHH pueden acumular prestaciones para un empleado especifico en un mes/año. |
| RF-PSV-07 | Acumular prestaciones masivo | ADMIN/RRHH pueden acumular prestaciones para todos los empleados activos en un mes/año. |
| RF-PSV-08 | Acumulacion automatica tras nomina | El sistema debe acumular prestaciones automaticamente al crear una nomina. |
| RF-PSV-09 | Acumulacion upsert | Si ya existen prestaciones para ese empleado/mes/año, se actualizan en lugar de duplicar. |
| RF-PSV-10 | Filtro por empleado (consulta) | ADMIN/RRHH pueden filtrar por cualquier empleado; EMPLEADO solo ve sus datos. |
| RF-PSV-11 | Campos calculados por mes | Cada mes registra: salario_base, dias_del_mes, prima, cesantias, intereses_cesantias, vacaciones. |

### 4.2 Aspectos a Evaluar (Pruebas de Caja Negra)

#### 4.2.1 Consulta de Prestaciones - `GET /api/prestaciones`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-PSV-01 | Consulta sin filtros (ADMIN) | Token ADMIN | 200 OK, prestaciones de todos los empleados del año actual |
| CP-PSV-02 | Consulta con año especifico | anio=2026 | 200 OK, datos del año solicitado |
| CP-PSV-03 | Consulta con id_empleado valido | id_empleado=1 | 200 OK, datos del empleado |
| CP-PSV-04 | Consulta con empleado sin prestaciones | id_empleado sin registros | 200 OK, arrays vacios o valores en 0 |
| CP-PSV-05 | Consulta como EMPLEADO | Token EMPLEADO | 200 OK, solo sus prestaciones |
| CP-PSV-06 | Consulta como EMPLEADO con id_empleado de otro | Token EMPLEADO, id_empleado=2 | 403 Forbidden o filtra solo sus datos |
| CP-PSV-07 | Consulta año sin prestaciones acumuladas | anio=2025 (sin datos) | 200 OK, sin registros |
| CP-PSV-08 | Verificar estructura de respuesta | Consulta exitosa | Response contiene anio, empleados[].totales.{prima, cesantias, intereses, vacaciones} |

#### 4.2.2 Acumulacion Individual - `POST /api/prestaciones/acumular`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-PSV-09 | Acumular prestaciones empleado activo | id_empleado=1, anio=2026, mes=5 | 200 OK, prestaciones acumuladas |
| CP-PSV-10 | Acumular prestaciones empleado inactivo | id_empleado con activo=0 | 404 Not Found o error empleado inactivo |
| CP-PSV-11 | Acumular como EMPLEADO | Token EMPLEADO | 403 Forbidden |
| CP-PSV-12 | Acumular mes invalido (0) | mes=0 | 400 Bad Request |
| CP-PSV-13 | Acumular mes invalido (13) | mes=13 | 400 Bad Request |
| CP-PSV-14 | Acumular mes ya acumulado (upsert) | Mismo empleado/mes/año dos veces | 200 OK, valores actualizados (no duplicados) |
| CP-PSV-15 | Acumular sin body | Body vacio | 400 Bad Request |
| CP-PSV-16 | Verificar calculo de prima | Empleado con salario 2,500,000, mes de 31 dias | prima = (2500000 * 31) * 1/12 / 30 = 215277.78 |
| CP-PSV-17 | Verificar calculo de cesantias | Mismo caso | cesantias = mismo valor que prima |
| CP-PSV-18 | Verificar calculo de intereses | cesantias * 0.12 * (dias_mes / 360) | Valor calculado correctamente |

#### 4.2.3 Acumulacion Masiva - `POST /api/prestaciones/acumular/masivo`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-PSV-19 | Acumulacion masiva para todos los empleados | anio=2026, mes=5 | 200 OK, N empleados acumulados |
| CP-PSV-20 | Acumulacion masiva mes con empleados inactivos | mes donde hay inactivos | Solo acumula para activos |
| CP-PSV-21 | Acumulacion masiva como RRHH | Token RRHH | 200 OK |
| CP-PSV-22 | Acumulacion masiva sin empleados activos | Todos inactivos | 404 Not Found, no hay empleados activos |

---

## 5. MODULO LIQUIDACIONES

### 5.1 Requerimientos Funcionales

| ID | Requerimiento | Descripcion |
|----|--------------|-------------|
| RF-LIQ-01 | Calcular liquidacion (preview) | El sistema debe calcular el valor estimado de liquidacion sin guardar. |
| RF-LIQ-02 | Guardar liquidacion | ADMIN/RRHH pueden guardar la liquidacion, lo que desactiva al empleado. |
| RF-LIQ-03 | Calcular prima en liquidacion | Debe calcular la prima proporcional a los dias trabajados en el año. |
| RF-LIQ-04 | Calcular cesantias en liquidacion | Debe calcular las cesantias proporcionales. |
| RF-LIQ-05 | Calcular intereses de cesantias | Debe calcular los intereses sobre cesantias proporcionales. |
| RF-LIQ-06 | Calcular vacaciones no disfrutadas | Debe calcular las vacaciones proporcionales no disfrutadas. |
| RF-LIQ-07 | Calcular sueldo pendiente | Debe calcular los dias pendientes desde el ultimo corte de nomina hasta la fecha de retiro. |
| RF-LIQ-08 | Calcular deducciones | Debe calcular salud (4%) y pension (4%) sobre sueldo pendiente. |
| RF-LIQ-09 | Marcar como pagada | ADMIN/RRHH pueden marcar una liquidacion como pagada. |
| RF-LIQ-10 | Anular liquidacion | ADMIN/RRHH pueden anular una liquidacion, reactivando al empleado. |
| RF-LIQ-11 | Revertir pago | ADMIN/RRHH pueden revertir una liquidacion pagada a pendiente, con opcion de reactivar empleado. |
| RF-LIQ-12 | Revertir anulacion | ADMIN/RRHH pueden revertir una anulacion, volviendo a desactivar al empleado. |
| RF-LIQ-13 | Eliminar liquidacion | ADMIN/RRHH pueden eliminar fisicamente una liquidacion y reactivar al empleado. |
| RF-LIQ-14 | Descargar PDF de liquidacion | El sistema debe generar y permitir descargar el PDF de la liquidacion. |
| RF-LIQ-15 | Listar liquidaciones | El sistema debe listar liquidaciones con filtros por empleado y estado. |
| RF-LIQ-16 | Consultar detalle de liquidacion | El sistema debe mostrar el detalle completo de una liquidacion con sus conceptos. |
| RF-LIQ-17 | Configurar periodo de espera para recontratacion | ADMIN/RRHH pueden configurar meses y dias de espera para recontratacion. |
| RF-LIQ-18 | Configurar jornada laboral por defecto | ADMIN/RRHH pueden configurar la jornada laboral por defecto (LUNES_VIERNES o LUNES_SABADO). |
| RF-LIQ-19 | Convencion 360/30 | Todos los calculos usan año de 360 dias y mes de 30 dias. |

### 5.2 Estados y Transiciones

```
PENDIENTE --> PAGADA    (marcar como pagada)
PENDIENTE --> ANULADA   (anular, reactiva empleado)
PAGADA    --> PENDIENTE (revertir pago, opcionalmente reactivar empleado)
ANULADA   --> PENDIENTE (revertir anulacion, desactiva empleado)
PENDIENTE --> (eliminacion directa, reactiva empleado)
ANULADA   --> (eliminacion directa)
```

### 5.3 Aspectos a Evaluar (Pruebas de Caja Negra)

#### 5.3.1 Calcular Liquidacion (Preview) - `POST /api/liquidacion/calcular`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-LIQ-01 | Calcular liquidacion empleado activo valido | id_empleado=1, fecha_retiro=2026-06-15, motivo="Renuncia" | 200 OK, calculo detallado |
| CP-LIQ-02 | Calcular con empleado inexistente | id_empleado=99999 | 404 Not Found |
| CP-LIQ-03 | Calcular con empleado ya inactivo | id_empleado con activo=0 | 400 Bad Request |
| CP-LIQ-04 | Calcular como EMPLEADO | Token EMPLEADO | 403 Forbidden |
| CP-LIQ-05 | Calcular sin fecha_retiro | Body sin fecha_retiro | 400 Bad Request |
| CP-LIQ-06 | Calcular con fecha_retiro futura | fecha_retiro > hoy + 30 dias | 400 Bad Request |
| CP-LIQ-07 | Calcular con fecha_retiro anterior a fecha_ingreso | fecha_retiro < fecha_ingreso | 400 Bad Request |
| CP-LIQ-08 | Verificar calculo de prima | Empleado con salario 2,500,000, 165 dias trabajados en el año | prima = (2500000 * 165) * 1/12 / 30 = 1,145,833.33 |
| CP-LIQ-09 | Verificar calculo de sueldo pendiente | 15 dias desde ultimo corte | sueldo = (2500000 / 30) * 15 = 1,250,000 |
| CP-LIQ-10 | Verificar deducciones | Salud: 4% de sueldo pendiente, Pension: 4% | Valores calculados correctamente |
| CP-LIQ-11 | Verificar estructura de preview | Calculo exitoso | Response contiene: detalle con conceptos DEVENGADO y DEDUCCION, y total |

#### 5.3.2 Guardar Liquidacion - `POST /api/liquidacion`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-LIQ-12 | Guardar liquidacion valida | id_empleado=1, fecha_retiro, motivo, detalle[] | 201 Created, empleado desactivado |
| CP-LIQ-13 | Guardar liquidacion sin detalle | Body sin detalle[] | 400 Bad Request |
| CP-LIQ-14 | Guardar liquidacion como EMPLEADO | Token EMPLEADO | 403 Forbidden |
| CP-LIQ-15 | Guardar liquidacion de empleado ya inactivo | Empleado con activo=0 | 400 Bad Request |
| CP-LIQ-16 | Verificar que empleado queda inactivo | Guardado exitoso | empleado.activo = 0, fecha_retiro seteada |
| CP-LIQ-17 | Verificar estado inicial PENDIENTE | Guardado exitoso | liquidacion.estado = PENDIENTE |

#### 5.3.3 Marcar como Pagada - `PUT /api/liquidacion/:id/pagar`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-LIQ-18 | Pagar liquidacion pendiente | PUT /pagar, id valido PENDIENTE | 200 OK, estado = PAGADA |
| CP-LIQ-19 | Pagar liquidacion ya pagada | id con estado PAGADA | 400 Bad Request |
| CP-LIQ-20 | Pagar liquidacion anulada | id con estado ANULADA | 400 Bad Request |
| CP-LIQ-21 | Pagar liquidacion inexistente | id=99999 | 404 Not Found |
| CP-LIQ-22 | Pagar como EMPLEADO | Token EMPLEADO | 403 Forbidden |

#### 5.3.4 Anular Liquidacion - `PUT /api/liquidacion/:id/anular`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-LIQ-23 | Anular liquidacion pendiente | PUT /anular, id PENDIENTE | 200 OK, estado = ANULADA, empleado reactivado |
| CP-LIQ-24 | Anular liquidacion pagada | id con estado PAGADA | 400 Bad Request |
| CP-LIQ-25 | Anular liquidacion ya anulada | id con estado ANULADA | 400 Bad Request |
| CP-LIQ-26 | Verificar reactivacion de empleado al anular | Anulacion exitosa | empleado.activo = 1, fecha_retiro = NULL |

#### 5.3.5 Revertir Pago - `PUT /api/liquidacion/:id/revertir-pago`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-LIQ-27 | Revertir pago sin reactivar | id PAGADA, body sin reactivar | 200 OK, estado = PENDIENTE, empleado sigue inactivo |
| CP-LIQ-28 | Revertir pago con reactivacion | id PAGADA, reactivar=true | 200 OK, estado = PENDIENTE, empleado activo |
| CP-LIQ-29 | Revertir pago de liquidacion pendiente | id PENDIENTE | 400 Bad Request |

#### 5.3.6 Revertir Anulacion - `PUT /api/liquidacion/:id/revertir-anulacion`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-LIQ-30 | Revertir anulacion | id ANULADA | 200 OK, estado = PENDIENTE, empleado desactivado |
| CP-LIQ-31 | Revertir anulacion de liquidacion pendiente | id PENDIENTE | 400 Bad Request |

#### 5.3.7 Eliminar Liquidacion - `DELETE /api/liquidacion/:id`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-LIQ-32 | Eliminar liquidacion no anulada | id PENDIENTE o PAGADA | 200 OK, empleado reactivado |
| CP-LIQ-33 | Eliminar liquidacion anulada | id ANULADA | 200 OK, empleado sigue activo |
| CP-LIQ-34 | Eliminar liquidacion inexistente | id=99999 | 404 Not Found |
| CP-LIQ-35 | Eliminar como EMPLEADO | Token EMPLEADO | 403 Forbidden |

#### 5.3.8 Listar y Consultar - `GET /api/liquidacion`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-LIQ-36 | Listar todas (ADMIN) | GET /api/liquidacion | 200 OK, todas las liquidaciones |
| CP-LIQ-37 | Listar filtrado por estado | ?estado=PENDIENTE | 200 OK, solo pendientes |
| CP-LIQ-38 | Listar filtrado por empleado | ?id_empleado=1 | 200 OK, solo de ese empleado |
| CP-LIQ-39 | Listar como EMPLEADO | Token EMPLEADO | 200 OK, solo sus liquidaciones |
| CP-LIQ-40 | Consultar detalle de liquidacion | GET /:id_liquidacion | 200 OK, con detalle[] de conceptos |
| CP-LIQ-41 | Consultar detalle inexistente | GET /99999 | 404 Not Found |
| CP-LIQ-42 | Consultar detalle de otro (EMPLEADO) | Id de liquidacion de otro empleado | 403 Forbidden |

#### 5.3.9 Descargar PDF - `GET /api/liquidacion/:id/pdf`

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-LIQ-43 | Descargar PDF de liquidacion propia (EMPLEADO) | Id de liquidacion propia | 200 OK, PDF descargable |
| CP-LIQ-44 | Descargar PDF de liquidacion de otro (EMPLEADO) | Id de otro empleado | 403 Forbidden |
| CP-LIQ-45 | Descargar PDF de liquidacion inexistente | id=99999 | 404 Not Found |
| CP-LIQ-46 | Descargar PDF como ADMIN de cualquier liquidacion | Id de cualquier empleado | 200 OK |

#### 5.3.10 Configuracion

| ID | Caso de Prueba | Entrada | Resultado Esperado |
|----|---------------|---------|-------------------|
| CP-LIQ-47 | Consultar config recontratacion | GET /config/recontratacion | 200 OK, meses_espera y dias_espera |
| CP-LIQ-48 | Actualizar config recontratacion valida | PUT /config/recontratacion, meses=3, dias=0 | 200 OK, config actualizada |
| CP-LIQ-49 | Actualizar config con valores negativos | meses=-1 | 400 Bad Request |
| CP-LIQ-50 | Consultar config jornada laboral | GET /config/jornada-laboral | 200 OK, jornada actual |
| CP-LIQ-51 | Actualizar jornada laboral valida | PUT /config/jornada-laboral, jornada="LUNES_SABADO" | 200 OK |
| CP-LIQ-52 | Actualizar jornada laboral invalida | jornada="LUNES_DOMINGO" | 400 Bad Request |
| CP-LIQ-53 | Acceder a config como EMPLEADO | Token EMPLEADO | 403 Forbidden |

---

## 6. RESUMEN DE CASOS DE PRUEBA POR MODULO

| Modulo | Casos de Prueba |
|--------|----------------|
| Reportes | 30 casos (RPT-01 a RPT-30) |
| Permisos/Novedades | 58 casos (PER-01 a PER-58) |
| Carga de Archivos/Soportes | 16 casos (ARC-01 a ARC-16) |
| Prestacion de Servicios | 22 casos (PSV-01 a PSV-22) |
| Liquidaciones | 53 casos (LIQ-01 a LIQ-53) |
| **TOTAL** | **179 casos de prueba de caja negra** |

## 7. MATRIZ DE VALIDACION POR MODULO

### Reportes
| Campo | Tipo | Requerido | Validacion |
|-------|------|-----------|------------|
| anio | Numero | No (default actual) | 2000-2100 |
| mes | Numero | No (default actual) | 1-12 |
| id_empleado | Numero | No | Debe existir en BD |

### Permisos/Novedades
| Campo | Tipo | Requerido | Validacion |
|-------|------|-----------|------------|
| id_empleado | Numero | Condicional (JWT si EMPLEADO) | Debe existir y estar activo |
| fecha_inicio | Date (YYYY-MM-DD) | Si | Formato valido |
| fecha_fin | Date (YYYY-MM-DD) | Si | >= fecha_inicio |
| tipo | Enum | Si | VACACIONES, PERMISO, INCAPACIDAD, LICENCIA |
| sub_tipo | String | Segun tipo | Valido segun catalogo |
| saldo_vacaciones | - | Solo VACACIONES | >= dias_solicitados |
| dias_disfrutar | Numero | Solo VACACIONES | >= 6 (primer bloque), <= 15 total |
| dias_dinero | Numero | Solo VACACIONES | <= 7 y <= 15 - dias_disfrutar |

### Carga de Archivos
| Campo | Tipo | Requerido | Validacion |
|-------|------|-----------|------------|
| support_file.type | MIME | Condicional | application/pdf, image/png, image/jpeg |
| support_file.content | Base64 | Condicional | < 5MB despues de decodificar |

### Prestacion de Servicios
| Campo | Tipo | Requerido | Validacion |
|-------|------|-----------|------------|
| id_empleado | Numero | Condicional | Debe existir y estar activo |
| anio | Numero | No (default actual) | 2000-2100 |
| mes | Numero | Si (acumular) | 1-12 |

### Liquidaciones
| Campo | Tipo | Requerido | Validacion |
|-------|------|-----------|------------|
| id_empleado | Numero | Si | Debe existir y estar activo |
| fecha_retiro | Date (YYYY-MM-DD) | Si | <= hoy, >= fecha_ingreso |
| motivo_retiro | String | Si | No vacio |
| estado | Enum | Solo lectura | PENDIENTE, PAGADA, ANULADA |
| detalle[].concepto | String | Si (guardar) | No vacio |
| detalle[].tipo | Enum | Si (guardar) | DEVENGADO, DEDUCCION |
| detalle[].valor | Numero | Si (guardar) | > 0 |

## 8. PRIORIDAD DE PRUEBAS

### Criticas (Alta Prioridad)
1. CRUD completo de solicitudes (vacaciones, permisos, incapacidades, licencias)
2. Validacion de saldo y reglas de vacaciones (bloque 6 dias, tope 15, solapamiento)
3. Calculo de liquidacion (prima, cesantias, intereses, vacaciones, sueldo pendiente)
4. Carga de archivos (formatos y tamanio)
5. Control de acceso por roles en todos los modulos

### Importantes (Media Prioridad)
1. Exportacion de reportes (Excel y PDF)
2. Acumulacion de prestaciones (individual y masiva)
3. Transiciones de estado en liquidaciones (pagar, anular, revertir)
4. Filtros de consulta (por año, mes, empleado, estado, tipo)
5. Validacion de parametros de entrada (años, meses, fechas)

### Complementarias (Baja Prioridad)
1. Descarga de PDF individual de nomina
2. Configuracion de parametros (recontratacion, jornada laboral)
3. Verificacion de nombres de archivo unicos
4. Pruebas con limites exactos (5MB archivo, 2000 año minimo, 2100 año maximo)

---

**Ultima actualizacion**: 30 de mayo de 2026
**Version**: 1.0
**Total casos de prueba**: 179
