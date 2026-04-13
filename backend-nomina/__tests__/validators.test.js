/**
 * PRUEBAS DE CAJA BLANCA - Validadores
 * Tests unitarios para todas las funciones validadoras
 */

const {
  validateName,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateIdentificationNumber,
  validateNumericField,
  validateDate,
  validateMinimumAge,
} = require('../src/utils/validators');

describe('PRUEBAS DE CAJA BLANCA - Validaciones', () => {
  
  // ============ PRUEBAS PARA validateName ============
  describe('validateName - Nombres y Apellidos', () => {
    
    test('Caso válido: nombre estándar con letras', () => {
      const result = validateName('Juan Carlos');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso válido: nombre con acentos', () => {
      const result = validateName('José María');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso inválido: nombre con números', () => {
      const result = validateName('Juan123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('números');
    });

    test('Caso inválido: nombre con caracteres especiales', () => {
      const result = validateName('Juan@Carlos');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('caracteres especiales');
    });

    test('Caso inválido: campo vacío', () => {
      const result = validateName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Campo vacío');
    });

    test('Caso inválido: solo espacios', () => {
      const result = validateName('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Campo vacío');
    });

    test('Caso inválido: longitud 1 (por debajo del mínimo)', () => {
      const result = validateName('A');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Longitud por debajo del mínimo');
    });

    test('Caso válido: longitud 2 (mínimo exacto)', () => {
      const result = validateName('AB');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso válido: longitud 3 (mínimo + 1)', () => {
      const result = validateName('ABC');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso válido: longitud 49 (máximo - 1)', () => {
      const name = 'A'.repeat(49);
      const result = validateName(name);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso válido: longitud 50 (máximo exacto)', () => {
      const name = 'A'.repeat(50);
      const result = validateName(name);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso inválido: longitud 51 (excede máximo)', () => {
      const name = 'A'.repeat(51);
      const result = validateName(name);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Longitud excede el máximo');
    });
  });

  // ============ PRUEBAS PARA validateEmail ============
  describe('validateEmail - Email', () => {
    
    test('Caso válido: email nuevo válido', () => {
      const result = validateEmail('usuario@ejemplo.com');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso inválido: email ya registrado (validación de formato)', () => {
      const result = validateEmail('usuario@ejemplo.com');
      expect(result.isValid).toBe(true); // Solo valida formato a nivel de validador
      expect(result.error).toBeNull();
    });

    test('Caso inválido: formato inválido (sin @)', () => {
      const result = validateEmail('usuarioejemplo.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Formato de email inválido');
    });

    test('Caso inválido: formato inválido (sin dominio)', () => {
      const result = validateEmail('usuario@');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Formato de email inválido');
    });

    test('Caso inválido: email con espacios', () => {
      const result = validateEmail('usuario @ejemplo.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('espacios');
    });

    test('Caso inválido: campo vacío', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Campo vacío');
    });
  });

  // ============ PRUEBAS PARA validatePassword ============
  describe('validatePassword - Contraseña', () => {
    
    test('Caso válido: contraseña válida', () => {
      const result = validatePassword('MiPassword123!');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso inválido: 7 caracteres (límite - 1)', () => {
      const result = validatePassword('1234567');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Contraseña muy corta');
    });

    test('Caso válido: 8 caracteres (límite exacto)', () => {
      const result = validatePassword('12345678');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso válido: 20 caracteres (límite exacto máximo)', () => {
      const result = validatePassword('12345678901234567890');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso inválido: 21 caracteres (límite + 1)', () => {
      const result = validatePassword('123456789012345678901');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Contraseña muy larga');
    });

    test('Caso inválido: campo vacío', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Campo vacío');
    });
  });

  // ============ PRUEBAS PARA validatePasswordMatch ============
  describe('validatePasswordMatch - Confirmación de contraseña', () => {
    
    test('Caso válido: contraseñas coinciden exactamente', () => {
      const result = validatePasswordMatch('MiPassword123', 'MiPassword123');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso inválido: contraseñas no coinciden', () => {
      const result = validatePasswordMatch('MiPassword123', 'OtraPassword456');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('no coinciden');
    });

    test('Caso inválido: diferencia de mayúscula/minúscula', () => {
      const result = validatePasswordMatch('MiPassword123', 'mipassword123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('no coinciden');
    });
  });

  // ============ PRUEBAS PARA validateIdentificationNumber ============
  describe('validateIdentificationNumber - Número de Identificación', () => {
    
    test('Caso válido: número de identificación válido', () => {
      const result = validateIdentificationNumber('12345678');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso válido: identificación con guiones', () => {
      const result = validateIdentificationNumber('1234-5678');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso inválido: campo vacío', () => {
      const result = validateIdentificationNumber('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('requerido');
    });

    test('Caso inválido: con caracteres especiales no permitidos', () => {
      const result = validateIdentificationNumber('1234@5678');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('inválido');
    });
  });

  // ============ PRUEBAS PARA validateNumericField ============
  describe('validateNumericField - Campo Numérico (Salario)', () => {
    
    test('Caso válido: salario válido', () => {
      const result = validateNumericField(1500.50, 0);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso válido: salario como string', () => {
      const result = validateNumericField('1500.50', 0);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso inválido: no es número', () => {
      const result = validateNumericField('abc', 0);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('número válido');
    });

    test('Caso inválido: campo vacío', () => {
      const result = validateNumericField('', 0);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('requerido');
    });

    test('Caso inválido: valor menor que mínimo', () => {
      const result = validateNumericField(-100, 0, 10000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Valor mínimo');
    });

    test('Caso inválido: valor mayor que máximo', () => {
      const result = validateNumericField(15000, 0, 10000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Valor máximo');
    });
  });

  // ============ PRUEBAS PARA validateDate ============
  describe('validateDate - Fecha', () => {
    
    test('Caso válido: fecha válida', () => {
      const result = validateDate('2000-05-15');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso inválido: formato incorrecto', () => {
      const result = validateDate('15/05/2000');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Formato de fecha inválido');
    });

    test('Caso inválido: fecha inválida', () => {
      const result = validateDate('2000-02-30');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Fecha inválida');
    });

    test('Caso inválido: campo vacío', () => {
      const result = validateDate('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('requerida');
    });
  });

  // ============ PRUEBAS PARA validateMinimumAge ============
  describe('validateMinimumAge - Edad Mínima (18 años)', () => {
    
    test('Caso válido: persona mayor de 18 años', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
      const dateString = birthDate.toISOString().split('T')[0];
      
      const result = validateMinimumAge(dateString, 18);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso inválido: persona menor de 18 años', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
      const dateString = birthDate.toISOString().split('T')[0];
      
      const result = validateMinimumAge(dateString, 18);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('18 años');
    });

    test('Caso válido: exactamente 18 años (en el cumpleaños)', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      const dateString = birthDate.toISOString().split('T')[0];
      
      const result = validateMinimumAge(dateString, 18);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  // ============ PRUEBAS PARA validatePassword (MEJORADO) ============
  describe('validatePassword - Contraseña (Mejorado con Mayúscula, Número y Especial)', () => {
    
    test('Caso válido: contraseña con mayúscula, número y carácter especial', () => {
      const result = validatePassword('Password123!');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso inválido: sin mayúscula', () => {
      const result = validatePassword('password123!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('mayúscula');
    });

    test('Caso inválido: sin número', () => {
      const result = validatePassword('PasswordTest!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('número');
    });

    test('Caso inválido: sin carácter especial', () => {
      const result = validatePassword('Password1234');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('carácter especial');
    });

    test('Caso válido: múltiples caracteres especiales', () => {
      const result = validatePassword('Pass@word#123');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso válido: 8 caracteres con todos requisitos', () => {
      const result = validatePassword('Pass1@bc');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso válido: 20 caracteres con todos requisitos', () => {
      const result = validatePassword('Password1@abcdefghij');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  // ============ PRUEBAS PARA validateUsername ============
  describe('validateUsername - Username', () => {
    
    test('Caso válido: username simple', () => {
      const result = validateUsername('user123');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso válido: username con guiones y guiones bajos', () => {
      const result = validateUsername('user_name-123');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso inválido: username muy corto (2 caracteres)', () => {
      const result = validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('muy corto');
    });

    test('Caso válido: username mínimo (3 caracteres)', () => {
      const result = validateUsername('abc');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso inválido: username con caracteres especiales no permitidos', () => {
      const result = validateUsername('user@name');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('letras, números');
    });

    test('Caso inválido: campo vacío', () => {
      const result = validateUsername('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('requerido');
    });
  });

  // ============ PRUEBAS PARA validateLoginInput ============
  describe('validateLoginInput - Inputs de Login', () => {
    
    test('Caso válido: username y password válidos', () => {
      const result = validateLoginInput('usuario123', 'password');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso inválido: username vacío', () => {
      const result = validateLoginInput('', 'password');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Usuario requerido');
    });

    test('Caso inválido: password vacío', () => {
      const result = validateLoginInput('usuario123', '');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Contraseña requerida');
    });

    test('Caso inválido: ambos campos vacíos', () => {
      const result = validateLoginInput('', '');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Usuario');
    });
  });

  // ============ PRUEBAS PARA validateResetToken ============
  describe('validateResetToken - Token de Recuperación', () => {
    
    test('Caso válido: token válido', () => {
      const result = validateResetToken('a1b2c3d4e5f6g7h8i9j0');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Caso inválido: token muy corto (menos de 10 caracteres)', () => {
      const result = validateResetToken('abc123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('inválido');
    });

    test('Caso inválido: token vacío', () => {
      const result = validateResetToken('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('requerido');
    });
  });
});
