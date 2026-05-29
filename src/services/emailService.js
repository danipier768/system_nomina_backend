const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || 'payrolldsv@gmail.com';
const FROM_NAME = 'Sistema de Nómina';

const verifyConnection = async () => {
    try {
        const [response] = await sgMail.send({
            to: FROM_EMAIL,
            from: { email: FROM_EMAIL, name: FROM_NAME },
            subject: '✅ Prueba de conexión - Sistema de Nómina',
            text: 'Conexión con SendGrid verificada exitosamente.',
        });
        console.log('✅ Servidor de email (SendGrid) conectado y listo');
        return true;
    } catch (error) {
        console.error('❌ Error al conectar con SendGrid:', error.message);
        if (error.response) {
            console.error('Detalles:', error.response.body);
        }
        return false;
    }
};

const sendPasswordResetEmail = async (to, username, token) => {
    try {
        const msg = {
            to,
            from: { email: FROM_EMAIL, name: FROM_NAME },
            subject: 'Recuperación de Contraseña - Sistema de Nómina',
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
                                <h1 style="color: #6366f1; margin: 0;">Recuperacion de Contrasena</h1>
                            </div>

                            <p>Hola <strong>${username}</strong>,</p>

                            <p>Recibimos una solicitud para restablecer tu contrasena. Usa el siguiente codigo de verificacion:</p>

                            <div class="token-box">
                                <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">Tu codigo de verificacion es:</div>
                                <div class="token">${token}</div>
                            </div>

                            <div class="warning">
                                <strong>Importante:</strong> Este codigo expirara en <strong>30 minutos</strong>.
                            </div>

                            <p>Para restablecer tu contrasena:</p>
                            <ol>
                                <li>Ve a la pagina de recuperacion de contrasena</li>
                                <li>Ingresa tu email y el codigo de verificacion</li>
                                <li>Crea tu nueva contrasena</li>
                            </ol>

                            <p><strong>No solicitaste esto?</strong><br>
                            Si no solicitaste restablecer tu contrasena, ignora este correo. Tu cuenta permanece segura.</p>

                            <div class="footer">
                                <p>Este es un correo automatico, por favor no respondas.</p>
                                <p>© ${new Date().getFullYear()} Sistema de Nomina. Todos los derechos reservados.</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Recuperacion de Contrasena - Sistema de Nomina

                Hola ${username},

                Recibimos una solicitud para restablecer tu contrasena.

                Tu codigo de verificacion es: ${token}

                Este codigo expirara en 30 minutos.

                Si no solicitaste esto, ignora este correo.

                © ${new Date().getFullYear()} Sistema de Nomina
            `,
        };

        const [response] = await sgMail.send(msg);
        console.log('Email enviado:', response.statusCode);
        return {
            success: true,
            messageId: response.headers['x-message-id'],
        };
    } catch (error) {
        console.error('Error al enviar email:', error.message);
        if (error.response) {
            console.error('Detalles:', error.response.body);
        }
        return {
            success: false,
            error: error.message,
        };
    }
};

const sendWelcomeEmail = async (to, username) => {
    try {
        const msg = {
            to,
            from: { email: FROM_EMAIL, name: FROM_NAME },
            subject: 'Bienvenido al Sistema de Nomina',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #6366f1;">Bienvenido al Sistema de Nomina!</h1>
                    <p>Hola <strong>${username}</strong>,</p>
                    <p>Tu cuenta ha sido creada exitosamente.</p>
                    <p>Ya puedes iniciar sesion con tu usuario y contrasena.</p>
                    <p>Saludos,<br>El equipo del Sistema de Nomina</p>
                </div>
            `,
        };

        const [response] = await sgMail.send(msg);
        console.log('Email de bienvenida enviado:', response.statusCode);
        return { success: true };
    } catch (error) {
        console.error('Error al enviar email de bienvenida:', error);
        if (error.response) {
            console.error('Detalles:', error.response.body);
        }
        return { success: false, error: error.message };
    }
};

module.exports = {
    verifyConnection,
    sendPasswordResetEmail,
    sendWelcomeEmail,
};
