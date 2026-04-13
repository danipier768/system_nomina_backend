/**
 * PRUEBAS DE CAJA NEGRA - Especificación de Casos de Test
 * 
 * Este documento describe los casos de prueba de caja negra para los formularios
 * de registro de empleados y usuarios según la especificación proporcionada.
 * 
 * Los tests verifican el comportamiento externo de los endpoints sin conocer
 * su implementación interna.
 */

// ============================================================================
// CASOS DE PRUEBA: FORMULARIO DE REGISTRO DE EMPLEADOS
// Endpoint: POST /employees
// ============================================================================

const EMPLOYEE_TEST_CASES = {
  
  // --- NOMBRES Y APELLIDOS ---
  names: {
    valid: {
      standard: {
        nombres: 'Juan Carlos',
        apellidos: 'García López',
        expectedStatus: 200,
        description: 'Nombre válido estándar con palabras separadas'
      },
      withAccents: {
        nombres: 'José María',
        apellidos: 'Pérez García',
        expectedStatus: 200,
        description: 'Nombre válido con acentos'
      }
    },
    invalid: {
      withNumbers: {
        nombres: 'Juan123',
        apellidos: 'García López',
        expectedStatus: 400,
        error: 'números',
        description: 'Nombre con números debe rechazarse'
      },
      withSpecialChars: {
        nombres: 'Juan@Carlos',
        apellidos: 'García López',
        expectedStatus: 400,
        error: 'caracteres especiales',
        description: 'Nombre con caracteres especiales debe rechazarse'
      },
      empty: {
        nombres: '',
        apellidos: 'García López',
        expectedStatus: 400,
        error: 'vacío',
        description: 'Campo vacío debe rechazarse'
      },
      length1: {
        nombres: 'A',
        apellidos: 'García López',
        expectedStatus: 400,
        error: 'Longitud por debajo del mínimo',
        description: 'Longitud 1 (por debajo mínimo) debe rechazarse'
      },
      length51: {
        nombres: 'A'.repeat(51),
        apellidos: 'García López',
        expectedStatus: 400,
        error: 'excede el máximo',
        description: 'Longitud 51 (excede máximo) debe rechazarse'
      }
    },
    boundary: {
      length2Min: {
        nombres: 'AB',
        apellidos: 'García López',
        expectedStatus: 200,
        description: 'Longitud 2 (mínimo exacto) válido'
      },
      length3MinPlus1: {
        nombres: 'ABC',
        apellidos: 'García López',
        expectedStatus: 200,
        description: 'Longitud 3 (mínimo + 1) válido'
      },
      length49MaxMinus1: {
        nombres: 'A'.repeat(49),
        apellidos: 'García López',
        expectedStatus: 200,
        description: 'Longitud 49 (máximo - 1) válido'
      },
      length50Max: {
        nombres: 'A'.repeat(50),
        apellidos: 'García López',
        expectedStatus: 200,
        description: 'Longitud 50 (máximo exacto) válido'
      }
    }
  },

  // --- IDENTIFICACIÓN ---
  identification: {
    valid: {
      standard: {
        numero_identificacion: '12345678',
        expectedStatus: 200,
        description: 'Número de identificación válido'
      }
    },
    invalid: {
      empty: {
        numero_identificacion: '',
        expectedStatus: 400,
        error: 'requerido',
        description: 'Campo vacío debe rechazarse'
      },
      duplicate: {
        numero_identificacion: '00000000', // Suponiendo que ya existe
        expectedStatus: 409,
        error: 'ya existe',
        description: 'Identificación duplicada debe rechazarse'
      }
    }
  },

  // --- SALARIO ---
  salary: {
    valid: {
      standard: {
        sueldo: 1500.50,
        expectedStatus: 200,
        description: 'Salario válido'
      }
    },
    invalid: {
      empty: {
        sueldo: '',
        expectedStatus: 400,
        error: 'requerido',
        description: 'Campo vacío debe rechazarse'
      },
      negative: {
        sueldo: -500,
        expectedStatus: 400,
        error: 'Valor mínimo',
        description: 'Salario negativo debe rechazarse'
      },
      notNumber: {
        sueldo: 'abc',
        expectedStatus: 400,
        error: 'número válido',
        description: 'Valor no numérico debe rechazarse'
      }
    }
  },

  // --- FECHAS ---
  dates: {
    valid: {
      standard: {
        fecha_nacimiento: '2000-05-15',
        fecha_ingreso: '2023-01-15',
        expectedStatus: 200,
        description: 'Fechas válidas en formato YYYY-MM-DD'
      }
    },
    invalid: {
      invalidFormat: {
        fecha_nacimiento: '15/05/2000',
        expectedStatus: 400,
        error: 'Formato de fecha inválido',
        description: 'Formato incorrecto debe rechazarse'
      },
      invalidDate: {
        fecha_nacimiento: '2000-02-30',
        expectedStatus: 400,
        error: 'Fecha inválida',
        description: 'Fecha inválida debe rechazarse'
      },
      underage: {
        fecha_nacimiento: new Date().toISOString().split('T')[0], // Hoy
        expectedStatus: 400,
        error: '18 años',
        description: 'Menor de 18 años debe rechazarse'
      }
    }
  }
};

// ============================================================================
// CASOS DE PRUEBA: FORMULARIO DE REGISTRO DE USUARIOS
// Endpoint: POST /auth/register
// ============================================================================

const USER_TEST_CASES = {
  
  // --- EMAIL ---
  email: {
    valid: {
      standard: {
        email: 'usuario@ejemplo.com',
        expectedStatus: 201,
        description: 'Email nuevo válido'
      }
    },
    invalid: {
      duplicate: {
        email: 'existing@ejemplo.com', // Email ya registrado
        expectedStatus: 409,
        error: 'ya existe',
        description: 'Email ya registrado debe rechazarse'
      },
      invalidFormat: {
        email: 'usuarioejemplo.com', // Sin @
        expectedStatus: 400,
        error: 'Formato de email inválido',
        description: 'Formato inválido debe rechazarse'
      },
      withSpaces: {
        email: 'usuario @ejemplo.com',
        expectedStatus: 400,
        error: 'espacios',
        description: 'Email con espacios debe rechazarse'
      },
      empty: {
        email: '',
        expectedStatus: 400,
        error: 'vacío',
        description: 'Campo vacío debe rechazarse'
      }
    }
  },

  // --- CONTRASEÑA ---
  password: {
    valid: {
      standard: {
        password: 'MiPassword123!',
        confirmPassword: 'MiPassword123!',
        expectedStatus: 201,
        description: 'Contraseña válida'
      }
    },
    invalid: {
      tooShort: {
        password: '1234567', // 7 caracteres (límite - 1)
        expectedStatus: 400,
        error: 'Contraseña muy corta',
        description: '7 caracteres (límite - 1) debe rechazarse'
      },
      tooLong: {
        password: '123456789012345678901', // 21 caracteres (límite + 1)
        expectedStatus: 400,
        error: 'Contraseña muy larga',
        description: '21 caracteres (límite + 1) debe rechazarse'
      },
      mismatch: {
        password: 'Password123',
        confirmPassword: 'Password456',
        expectedStatus: 400,
        error: 'no coinciden',
        description: 'Contraseñas que no coinciden deben rechazarse'
      },
      empty: {
        password: '',
        expectedStatus: 400,
        error: 'vacío',
        description: 'Campo vacío debe rechazarse'
      }
    },
    boundary: {
      length8Min: {
        password: '12345678',
        confirmPassword: '12345678',
        expectedStatus: 201,
        description: '8 caracteres (límite exacto) válido'
      },
      length20Max: {
        password: '12345678901234567890',
        confirmPassword: '12345678901234567890',
        expectedStatus: 201,
        description: '20 caracteres (límite exacto máximo) válido'
      },
      passwordMatch: {
        password: 'TestPassword123',
        confirmPassword: 'TestPassword123',
        expectedStatus: 201,
        description: 'Contraseñas coinciden exactamente (válido)'
      }
    }
  }
};

// ============================================================================
// CASOS DE PRUEBA: LOGIN
// Endpoint: POST /auth/login
// ============================================================================

const LOGIN_TEST_CASES = {
  
  // --- USERNAME ---
  username: {
    valid: {
      standard: {
        username: 'usuario123',
        password: 'ValidPass123!',
        expectedStatus: 200,
        description: 'Username válido'
      }
    },
    invalid: {
      empty: {
        username: '',
        password: 'ValidPass123!',
        expectedStatus: 400,
        error: 'Usuario requerido',
        description: 'Username vacío debe rechazarse'
      },
      notFound: {
        username: 'usuarioNoExiste',
        password: 'ValidPass123!',
        expectedStatus: 401,
        error: 'incorrectos',
        description: 'Username que no existe debe rechazarse'
      }
    }
  },

  // --- CONTRASEÑA ---
  password: {
    valid: {
      standard: {
        username: 'usuario123',
        password: 'ValidPass123!',
        expectedStatus: 200,
        description: 'Contraseña válida'
      }
    },
    invalid: {
      empty: {
        username: 'usuario123',
        password: '',
        expectedStatus: 400,
        error: 'Contraseña requerida',
        description: 'Contraseña vacía debe rechazarse'
      },
      incorrect: {
        username: 'usuario123',
        password: 'IncorrectPass123!',
        expectedStatus: 401,
        error: 'incorrectos',
        description: 'Contraseña incorrecta debe rechazarse'
      }
    }
  },

  // --- COMBINACIONES ---
  combinations: {
    valid: {
      correctCredentials: {
        username: 'usuario123',
        password: 'ValidPass123!',
        expectedStatus: 200,
        description: 'Credentials correctos (token devuelto)'
      }
    },
    invalid: {
      inactiveUser: {
        username: 'usuarioInactivo',
        password: 'ValidPass123!',
        expectedStatus: 403,
        error: 'desactivada',
        description: 'Usuario inactivo debe rechazarse'
      },
      bothEmpty: {
        username: '',
        password: '',
        expectedStatus: 400,
        error: 'Usuario',
        description: 'Ambos campos vacíos deben rechazarse'
      }
    }
  }
};

// ============================================================================
// CASOS DE PRUEBA: RECUPERAR CONTRASEÑA (PASSWORD RESET)
// Endpoint: POST /auth/requestPasswordReset
// Endpoint: POST /auth/resetPassword
// ============================================================================

const PASSWORD_RESET_TEST_CASES = {
  
  // --- REQUEST PASSWORD RESET ---
  requestReset: {
    email: {
      valid: {
        standard: {
          email: 'usuario@ejemplo.com',
          expectedStatus: 200,
          description: 'Email válido (token enviado si existe)'
        }
      },
      invalid: {
        empty: {
          email: '',
          expectedStatus: 400,
          error: 'email',
          description: 'Email vacío debe rechazarse'
        },
        invalidFormat: {
          email: 'usuarioejemplo.com',
          expectedStatus: 400,
          error: 'Formato de email inválido',
          description: 'Formato incorrecto debe rechazarse'
        },
        withSpaces: {
          email: 'usuario @ejemplo.com',
          expectedStatus: 400,
          error: 'espacios',
          description: 'Email con espacios debe rechazarse'
        },
        notFound: {
          email: 'noexiste@ejemplo.com',
          expectedStatus: 200,
          description: 'Email inexistente retorna mensaje genérico (seguridad)'
        }
      }
    }
  },

  // --- RESET PASSWORD ---
  resetPassword: {
    newPassword: {
      valid: {
        withRequirements: {
          email: 'usuario@ejemplo.com',
          token: 'validTokena1b2c3d4e5f6',
          newPassword: 'NewPass123!',
          confirmPassword: 'NewPass123!',
          expectedStatus: 200,
          description: 'Contraseña con mayúscula, número y carácter especial'
        }
      },
      invalid: {
        withoutUppercase: {
          email: 'usuario@ejemplo.com',
          token: 'validTokena1b2c3d4e5f6',
          newPassword: 'newpass123!',
          confirmPassword: 'newpass123!',
          expectedStatus: 400,
          error: 'mayúscula',
          description: 'Sin mayúscula debe rechazarse'
        },
        withoutNumber: {
          email: 'usuario@ejemplo.com',
          token: 'validTokena1b2c3d4e5f6',
          newPassword: 'NewPass!abc',
          confirmPassword: 'NewPass!abc',
          expectedStatus: 400,
          error: 'número',
          description: 'Sin número debe rechazarse'
        },
        withoutSpecial: {
          email: 'usuario@ejemplo.com',
          token: 'validTokena1b2c3d4e5f6',
          newPassword: 'NewPass12345',
          confirmPassword: 'NewPass12345',
          expectedStatus: 400,
          error: 'carácter especial',
          description: 'Sin carácter especial debe rechazarse'
        },
        mismatch: {
          email: 'usuario@ejemplo.com',
          token: 'validTokena1b2c3d4e5f6',
          newPassword: 'NewPass123!',
          confirmPassword: 'DifferPass456!',
          expectedStatus: 400,
          error: 'no coinciden',
          description: 'Contraseñas que no coinciden deben rechazarse'
        },
        tooShort: {
          email: 'usuario@ejemplo.com',
          token: 'validTokena1b2c3d4e5f6',
          newPassword: 'Pass1!',
          confirmPassword: 'Pass1!',
          expectedStatus: 400,
          error: 'muy corta',
          description: 'Contraseña muy corta (menos de 8) debe rechazarse'
        }
      }
    },
    token: {
      valid: {
        standard: {
          token: 'validTokena1b2c3d4e5f6',
          expectedStatus: 200,
          description: 'Token válido'
        }
      },
      invalid: {
        invalid: {
          token: 'abc123',
          expectedStatus: 400,
          error: 'Token inválido',
          description: 'Token muy corto debe rechazarse'
        },
        expired: {
          token: 'validTokenButExpireda1b2c3d4e5f6',
          expectedStatus: 400,
          error: 'expirado',
          description: 'Token expirado debe rechazarse'
        },
        alreadyUsed: {
          token: 'alreadyUsedTokena1b2c3d4e5f6',
          expectedStatus: 400,
          error: 'ya fue utilizado',
          description: 'Token ya utilizado debe rechazarse'
        }
      }
    },
    email: {
      valid: {
        standard: {
          email: 'usuario@ejemplo.com',
          expectedStatus: 200,
          description: 'Email válido'
        }
      },
      invalid: {
        invalidFormat: {
          email: 'usuarioejemplo.com',
          expectedStatus: 400,
          error: 'Formato de email inválido',
          description: 'Formato incorrecto debe rechazarse'
        },
        notFound: {
          email: 'noexiste@ejemplo.com',
          expectedStatus: 404,
          error: 'Usuario no encontrado',
          description: 'Usuario no encontrado debe rechazarse'
        }
      }
    }
  }
};

module.exports = {
  EMPLOYEE_TEST_CASES,
  USER_TEST_CASES,
  LOGIN_TEST_CASES,
  PASSWORD_RESET_TEST_CASES,
};

/**
 * RESUMEN DE CASOS DE PRUEBA
 * 
 * EMPLEADOS: 24 casos
 * - Nombres: 9 casos (1 válido, 4 inválidos, 4 límite)
 * - Identificación: 3 casos (1 válido, 2 inválidos)
 * - Salario: 4 casos (1 válido, 3 inválidos)
 * - Fechas: 5 casos (1 válido, 3 inválidos)
 * - Cargo: Similar a nombres (5 casos)
 * Total estimado: ~30+ casos
 * 
 * USUARIOS: 18+ casos
 * - Email: 5 casos (1 válido, 4 inválidos)
 * - Contraseña: 7 casos (1 válido, 4 inválidos, 3 límite)
 * - Username: 2 casos (validación de unicidad)
 * - Rol: 2 casos (validación de rol válido)
 * Total estimado: ~18+ casos
 * 
 * LOGIN: 8+ casos
 * - Username: 2 casos (vacío, válido)
 * - Contraseña: 2 casos (vacío, válido)
 * - Combinaciones: 4 casos (ambos válidos, credenciales incorrectas, usuario inactivo)
 * Total estimado: ~8+ casos
 * 
 * RECUPERAR CONTRASEÑA: 12+ casos
 * - Email: 5 casos (válido, inválido, no existe, con espacios, vacío)
 * - Contraseña nueva: 5 casos (válida, sin mayúscula, sin número, sin especial, no coincide)
 * - Token: 2 casos (válido, inválido)
 * Total estimado: ~12+ casos
 * 
 * TOTAL GENERAL: ~70+ casos de prueba de caja negra
 */
