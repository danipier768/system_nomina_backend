# Validaciones de Formularios - Especificación de Test

## 📋 Resumen

Se han implementado validaciones exhaustivas para los formularios de **registro de empleados** y **registro de usuarios** siguiendo el estándar de pruebas de caja blanca y caja negra.

## ✅ Validaciones Implementadas

### 1. **Nombres y Apellidos** (2-50 caracteres)
- ✓ Válido: Nombre estándar con solo letras y espacios
- ✗ Inválido: Nombre con números
- ✗ Inválido: Nombre con caracteres especiales
- ✗ Inválido: Campo vacío
- ✗ Inválido: Longitud 1 (por debajo mínimo)
- ✓ Válido: Longitud 2 (mínimo exacto)
- ✓ Válido: Longitud 3 (mínimo + 1)
- ✓ Válido: Longitud 49 (máximo - 1)
- ✓ Válido: Longitud 50 (máximo exacto)
- ✗ Inválido: Longitud 51 (excede máximo)

### 2. **Identificación**
- ✓ Válido: Número de identificación estándar
- ✗ Inválido: Campo vacío
- ✗ Inválido: Identificación duplicada
- ✗ Inválido: Caracteres especiales no permitidos

### 3. **Salario** (Numérico)
- ✓ Válido: Salario válido (ej: 1500.50)
- ✗ Inválido: Campo vacío
- ✗ Inválido: Valor negativo
- ✗ Inválido: No es número

### 4. **Fechas**
- ✓ Válido: Fecha en formato YYYY-MM-DD
- ✗ Inválido: Formato incorrecto (ej: 15/05/2000)
- ✗ Inválido: Fecha inexistente (ej: 2000-02-30)
- ✗ Inválido: Menor de 18 años

### 5. **Email** (Validación de formulario de usuario)
- ✓ Válido: Email nuevo válido
- ✗ Inválido: Email ya registrado
- ✗ Inválido: Formato inválido
- ✗ Inválido: Email con espacios
- ✗ Inválido: Campo vacío

### 6. **Contraseña** (8-20 caracteres, con Mayúscula, Número y Carácter Especial)
- ✓ Válido: Contraseña con mayúscula, número y carácter especial (ej: `Password123!`)
- ✗ Inválido: Sin mayúscula (ej: `password123!`)
- ✗ Inválido: Sin número (ej: `PasswordTest!`)
- ✗ Inválido: Sin carácter especial (ej: `Password1234`)
- ✗ Inválido: 7 caracteres (límite - 1)
- ✓ Válido: 8 caracteres con todos requisitos (ej: `Pass1@bc`)
- ✓ Válido: 20 caracteres (límite exacto máximo)
- ✗ Inválido: 21 caracteres (límite + 1)
- ✗ Inválido: No coincide con confirmación
- ✓ Válido: Coincide exactamente

### 7. **Confirmación de Contraseña**
- ✓ Válido: Contraseña coincide exactamente
- ✗ Inválido: Contraseña no coincide
- ✗ Inválido: Diferencia de mayúscula/minúscula

### 8. **Username** (3-50 caracteres, alfanumérico con guiones)
- ✓ Válido: Username simple (ej: `user123`)
- ✓ Válido: Username con guiones y guiones bajos (ej: `user_name-123`)
- ✗ Inválido: Muy corto (2 caracteres)
- ✓ Válido: Mínimo (3 caracteres)
- ✗ Inválido: Con caracteres especiales no permitidos (ej: `user@name`)
- ✗ Inválido: Campo vacío

### 9. **Inputs de Login**
- ✓ Válido: Username y password válidos
- ✗ Inválido: Username vacío
- ✗ Inválido: Password vacío
- ✗ Inválido: Ambos campos vacíos
- ✗ Inválido: Credenciales incorrectas
- ✗ Inválido: Usuario inactivo

### 10. **Token de Recuperación de Contraseña**
- ✓ Válido: Token válido (mínimo 10 caracteres)
- ✗ Inválido: Token muy corto (menos de 10 caracteres)
- ✗ Inválido: Token vacío
- ✗ Inválido: Token expirado
- ✗ Inválido: Token ya utilizado

## 📁 Estructura de Archivos

```
backend-nomina/
├── __tests__/
│   ├── validators.test.js           # Pruebas de caja blanca
│   └── integration/
│       └── testCases.spec.js         # Especificación de casos de caja negra
├── src/
│   ├── utils/
│   │   └── validators.js             # Funciones validadoras
│   ├── modules/
│   │   ├── employees/
│   │   │   └── employees.controller.js (actualizado)
│   │   └── auth/
│   │       └── auth.controller.js (actualizado)
├── jest.config.js                    # Configuración de Jest
└── package.json                      # Scripts de test actualizados
```

## 🚀 Cómo Ejecutar los Tests

### Instalación de dependencias
```bash
cd backend-nomina
npm install
```

### Ejecutar todos los tests
```bash
npm test
```

### Ejecutar tests en modo observación
```bash
npm run test:watch
```

### Ejecutar tests con cobertura detallada
```bash
npm test -- --coverage
```

## 📊 Cobertura de Pruebas

### Pruebas de Caja Blanca ✓
- **Archivo**: `__tests__/validators.test.js`
- **Función**: Pruebas unitarias de todas las funciones validadoras
- **Casos**: ~60+ tests
- **Cubre**: 
  - Valores válidos
  - Valores inválidos
  - Límites (mínimo - 1, mínimo exacto, máximo exacto, máximo + 1)
  - Casos especiales (vacío, nulo, formato incorrecto)
  - Nuevas validaciones: mayúscula, número, carácter especial en contraseña

### Pruebas de Caja Negra ✓
- **Archivo**: `__tests__/integration/testCases.spec.js`
- **Función**: Especificación de casos de prueba para endpoints
- **Casos**: ~70+ casos definidos
- **Cubre**:
  - Endpoints: 
    - POST /employees
    - POST /auth/register
    - POST /auth/login
    - POST /auth/requestPasswordReset
    - POST /auth/resetPassword
  - Respuestas HTTP esperadas (200, 201, 400, 403, 404, 409)
  - Mensajes de error específicos
  - Comportamiento funcional
  - Validaciones de seguridad (usuario inactivo, token expirado, etc)

## 🔍 Funciones Validadoras Disponibles

```javascript
// src/utils/validators.js
validateName(nombre)                    // Nombres/Apellidos (2-50 caracteres)
validateEmail(email)                    // Email (formato válido)
validatePassword(password)              // Contraseña (8-20, mayúscula, número, especial)
validatePasswordMatch(pwd, confirmPwd)  // Confirmación de contraseña
validateIdentificationNumber(numero)    // Número de identificación
validateNumericField(value, min, max)   // Campos numéricos (salario)
validateDate(date)                      // Fechas (formato YYYY-MM-DD)
validateMinimumAge(birthDate, minAge)   // Edad mínima (18 años)
validateUsername(username)              // Username (3-50, alfanumérico)
validateLoginInput(username, password)  // Inputs de login
validateResetToken(token)               // Token de recuperación (min 10 chars)
```

## 📝 Ejemplo de Uso

### En el Backend (Controller)
```javascript
const { validateName, validateEmail, validatePassword } = require('../../utils/validators');

const createEmployee = async (req, res) => {
  // Validar nombres
  const nombresValidation = validateName(req.body.nombres);
  if (!nombresValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: `Nombres: ${nombresValidation.error}`
    });
  }
  
  // Validar email
  const emailValidation = validateEmail(req.body.email);
  if (!emailValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: `Email: ${emailValidation.error}`
    });
  }
  
  // ... resto del código
};
```

## 🎯 Casos de Prueba Prioritarios

### Críticos (Alta Prioridad)
1. Validación de longitud de nombres
2. Validación de email existente
3. Validación de contraseña coincidente
4. Validación de edad mínima
5. Validación de identificación duplicada

### Importantes (Media Prioridad)
1. Validación de formato de fechas
2. Validación de números negativos
3. Validación de caracteres especiales
4. Validación de límites de contraseña

### Complementarios (Baja Prioridad)
1. Validación de límites superiores
2. Validación de campos vacíos
3. Validación de caracteres especiales en identificación

## 📊 Matriz de Validación

| Campo | Mínimo | Máximo | Tipo | Duplicado | Formato |
|-------|--------|--------|------|-----------|---------|
| Nombres | 2 | 50 | Letras+Espacios | No | Requerido |
| Apellidos | 2 | 50 | Letras+Espacios | No | Requerido |
| Identificación | 1 | 20 | Números/Guiones | **Sí** | Requerido |
| Salario | 0 | ∞ | Numérico | No | Requerido |
| Fecha Nacimiento | - | - | YYYY-MM-DD | No | Opcional |
| Fecha Ingreso | - | - | YYYY-MM-DD | No | Opcional |
| Email | 5 | 255 | Email válido | **Sí** | Requerido |
| Username | 3 | 50 | Alfanumérico | **Sí** | Requerido |
| Contraseña | 8 | 20 | Cualquier | No | Requerido |
| Confirmación | 8 | 20 | = Password | No | Condicional |

## 🔒 Seguridad

- ✓ Las contraseñas se validan con límite máximo (previene ataque de buffer)
- ✓ Los nombres se validan para evitar inyección de código
- ✓ Los emails se validan para evitar ingresos fraudulentos
- ✓ Las fechas se validan para evitar cálculos incorrectos
- ✓ Los números se validan para evitar operaciones inválidas

## 📞 Soporte

Pour exécuter les tests et vérifier que tous les cas passent:
```bash
npm test
```

Los tests mostrarán un reporte detallado con:
- ✓ Tests pasados
- ✗ Tests fallidos (si hay)
- Coverage por función
- Tiempo de ejecución

---

**Última actualización**: 13 de abril de 2026
**Versión**: 2.0 (Con validaciones mejoradas de contraseña, login y password reset)
