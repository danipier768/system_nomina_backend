// ============================================
// SCRIPT PARA CREAR USUARIO ADMINISTRADOR
// Archivo: scripts/createAdmin.js
// ============================================

const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database.js');
require('dotenv').config();

// ============================================
// CREAR USUARIO ADMIN
// ============================================

const createAdmin = async () => {
    try {
        console.log('🔧 Iniciando creación de usuario administrador...\n');

        // Datos del admin
        const adminData = {
            username: 'admin',
            password: 'Admin123!',
            email: 'admin@sistema.com'
        };

        // 1. Verificar si el rol ADMINISTRADOR existe
        console.log('📋 Verificando rol ADMINISTRADOR...');
        const [roles] = await pool.query(
            "SELECT id_rol FROM roles WHERE nombre_rol = 'ADMINISTRADOR'"
        );

        if (roles.length === 0) {
            console.error('❌ No existe el rol ADMINISTRADOR en la base de datos');
            console.log('💡 Ejecuta este SQL primero:');
            console.log("   INSERT INTO roles (nombre_rol) VALUES ('ADMINISTRADOR');");
            process.exit(1);
        }

        const id_rol = roles[0].id_rol;
        console.log('✅ Rol ADMINISTRADOR encontrado (ID:', id_rol, ')\n');

        // 2. Verificar si ya existe el usuario
        console.log('🔍 Verificando si el usuario admin ya existe...');
        const [existingUsers] = await pool.query(
            'SELECT id_usuario, username FROM usuarios WHERE username = ?',
            [adminData.username]
        );

        if (existingUsers.length > 0) {
            console.log('⚠️  El usuario admin ya existe');
            console.log('🔄 Actualizando contraseña...\n');
            
            // Actualizar contraseña
            const hashedPassword = await bcrypt.hash(adminData.password, 10);
            
            await pool.query(
                'UPDATE usuarios SET password = ?, email = ?, activo = TRUE WHERE username = ?',
                [hashedPassword, adminData.email, adminData.username]
            );
            
            console.log('✅ Usuario admin actualizado exitosamente\n');
        } else {
            console.log('➕ Creando nuevo usuario admin...\n');
            
            // Encriptar contraseña
            const hashedPassword = await bcrypt.hash(adminData.password, 10);
            
            // Crear usuario
            await pool.query(
                `INSERT INTO usuarios (username, password, email, id_rol, activo) 
                 VALUES (?, ?, ?, ?, TRUE)`,
                [adminData.username, hashedPassword, adminData.email, id_rol]
            );
            
            console.log('✅ Usuario admin creado exitosamente\n');
        }

        // 3. Mostrar información del usuario
        console.log('═'.repeat(50));
        console.log('📋 INFORMACIÓN DEL USUARIO ADMINISTRADOR');
        console.log('═'.repeat(50));
        console.log('👤 Usuario:', adminData.username);
        console.log('🔑 Contraseña:', adminData.password);
        console.log('📧 Email:', adminData.email);
        console.log('🎭 Rol: ADMINISTRADOR');
        console.log('═'.repeat(50));
        console.log('\n💡 Usa estas credenciales para hacer login\n');

        // 4. Generar hash de ejemplo (útil para documentación)
        console.log('🔐 Hash generado (para referencia):');
        console.log(await bcrypt.hash(adminData.password, 10));
        console.log();

        process.exit(0);

    } catch (error) {
        console.error('❌ Error al crear usuario admin:', error.message);
        process.exit(1);
    }
};

// ============================================
// EJECUTAR SCRIPT
// ============================================

console.log('\n' + '═'.repeat(50));
console.log('🚀 SCRIPT DE CREACIÓN DE USUARIO ADMINISTRADOR');
console.log('═'.repeat(50) + '\n');

createAdmin();

// ============================================
// INSTRUCCIONES DE USO
// ============================================

/*
CÓMO USAR ESTE SCRIPT:

1. Asegúrate de estar en la carpeta backend:
   cd backend

2. Crea la carpeta scripts si no existe:
   mkdir scripts

3. Guarda este archivo como: scripts/createAdmin.js

4. Ejecuta el script:
   node scripts/createAdmin.js

5. El script:
   - Verifica que exista el rol ADMINISTRADOR
   - Crea o actualiza el usuario admin
   - Muestra las credenciales para login
   - Genera el hash de la contraseña

NOTAS:
- Si el usuario admin ya existe, solo actualiza la contraseña
- La contraseña por defecto es: Admin123!
- Puedes cambiar los datos en el objeto adminData
- El script usa bcrypt para encriptar la contraseña
*/