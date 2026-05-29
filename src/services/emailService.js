// ============================================
// SERVICIO DE EMAIL
// Archivo: services/emailService.js
// ============================================

const nodemailer = require('nodemailer');

// ============================================
// CONFIGURAR TRANSPORTER
// ============================================

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

// ============================================
// VERIFICAR CONEXIÓN
// ============================================

const verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log('✅ Servidor de email conectado y listo');
        return true;
    } catch (error) {
        console.error('❌ Error al conectar con el servidor de email:', error.message);
        return false;
    }
};

// ============================================
// ENVIAR EMAIL DE RECUPERACIÓN DE CONTRASEÑA
// ============================================

const sendPasswordResetEmail = async (to, username, token) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'Sistema de Nómina <noreply@sistema.com>',
            to: to,
            subject: '🔐 Recuperación de Contraseña - Sistema de Nómina',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #f9fafb;
                        }
                        .card {
                            background-color: white;
                            border-radius: 8px;
                            padding: 30px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 30px;
                        }
                        .token-box {
                            background-color: #f3f4f6;
                            border: 2px solid #6366f1;
                            border-radius: 8px;
                            padding: 20px;
                            text-align: center;
                            margin: 25px 0;
                        }
                        .token {
                            font-size: 32px;
                            font-weight: bold;
                            color: #6366f1;
                            letter-spacing: 5px;
                        }
                        .footer {
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid #e5e7eb;
                            font-size: 12px;
                            color: #6b7280;
                            text-align: center;
                        }
                        .warning {
                            background-color: #fef3c7;
                            border-left: 4px solid #f59e0b;
                            padding: 15px;
                            margin: 20px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="card">
                            <div class="header">
                                <h1 style="color: #6366f1; margin: 0;">🔐 Recuperación de Contraseña</h1>
                            </div>
                            
                            <p>Hola <strong>${username}</strong>,</p>
                            
                            <p>Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código de verificación:</p>
                            
                            <div class="token-box">
                                <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">Tu código de verificación es:</div>
                                <div class="token">${token}</div>
                            </div>
                            
                            <div class="warning">
                                <strong>⏰ Importante:</strong> Este código expirará en <strong>30 minutos</strong>.
                            </div>
                            
                            <p>Para restablecer tu contraseña:</p>
                            <ol>
                                <li>Ve a la página de recuperación de contraseña</li>
                                <li>Ingresa tu email y el código de verificación</li>
                                <li>Crea tu nueva contraseña</li>
                            </ol>
                            
                            <p><strong>¿No solicitaste esto?</strong><br>
                            Si no solicitaste restablecer tu contraseña, ignora este correo. Tu cuenta permanece segura.</p>
                            
                            <div class="footer">
                                <p>Este es un correo automático, por favor no respondas.</p>
                                <p>© ${new Date().getFullYear()} Sistema de Nómina. Todos los derechos reservados.</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Recuperación de Contraseña - Sistema de Nómina
                
                Hola ${username},
                
                Recibimos una solicitud para restablecer tu contraseña.
                
                Tu código de verificación es: ${token}
                
                Este código expirará en 30 minutos.
                
                Si no solicitaste esto, ignora este correo.
                
                © ${new Date().getFullYear()} Sistema de Nómina
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email enviado:', info.messageId);
        return {
            success: true,
            messageId: info.messageId
        };

    } catch (error) {
        console.error('❌ Error al enviar email:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// ============================================
// ENVIAR EMAIL DE BIENVENIDA (OPCIONAL)
// ============================================

const sendWelcomeEmail = async (to, username) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: to,
            subject: '👋 Bienvenido al Sistema de Nómina',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #6366f1;">¡Bienvenido al Sistema de Nómina!</h1>
                    <p>Hola <strong>${username}</strong>,</p>
                    <p>Tu cuenta ha sido creada exitosamente.</p>
                    <p>Ya puedes iniciar sesión con tu usuario y contraseña.</p>
                    <p>Saludos,<br>El equipo del Sistema de Nómina</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email de bienvenida enviado:', info.messageId);
        return { success: true };

    } catch (error) {
        console.error('❌ Error al enviar email de bienvenida:', error);
        return { success: false, error: error.message };
    }
};

// ============================================
// EXPORTAR FUNCIONES
// ============================================

module.exports = {
    verifyConnection,
    sendPasswordResetEmail,
    sendWelcomeEmail
};