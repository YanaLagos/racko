const Brevo = require('@getbrevo/brevo');

const enviarCorreoRecuperacion = async (email, token) => {
  let apiInstance = new Brevo.TransactionalEmailsApi();

  let apiKey = apiInstance.authentications['apiKey'];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  let sendSmtpEmail = new Brevo.SendSmtpEmail();

  const link = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  sendSmtpEmail.subject = "Recupera tu contraseña - Racko";
  sendSmtpEmail.htmlContent = `
    <html>
      <body>
        <h1>Hola,</h1>
        <p>Has solicitado restablecer tu contraseña en Racko.</p>
        <p>Haz clic en el siguiente enlace para crear una contraseña nueva:</p>
        <a href="${link}">Restablecer contraseña</a>
        <p>Este enlace expirará en 1 hora.</p>
      </body>
    </html>
  `;

  sendSmtpEmail.sender = { name: "Racko soporte", email: "gestionracko@gmail.com" };
  sendSmtpEmail.to = [{ email }];

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    return true;
  } catch (error) {
    console.error("Error enviando email con Brevo:", error);
    return false;
  }
};

const enviarCorreoInvitacionPassword = async (email, token, username) => {
  let apiInstance = new Brevo.TransactionalEmailsApi();
  let apiKey = apiInstance.authentications['apiKey'];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  let sendSmtpEmail = new Brevo.SendSmtpEmail();

  const link = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  sendSmtpEmail.subject = "Activa tu cuenta - Define tu contraseña (Racko)";
  sendSmtpEmail.htmlContent = `
    <html>
      <body>
        <h1>Hola,</h1>
        <p>Se creó una cuenta para ti en Racko.</p>
        <p><strong>Tu usuario:</strong> ${username}</p>
        <p>Para activar tu acceso, define tu contraseña aquí:</p>
        <a href="${link}">Crear contraseña</a>
        <p>Este enlace expirará en 1 hora.</p>
      </body>
    </html>
  `;

  sendSmtpEmail.sender = { name: "Racko soporte", email: "gestionracko@gmail.com" };
  sendSmtpEmail.to = [{ email }];

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    return true;
  } catch (error) {
    console.error("Error enviando email invitación con Brevo:", error);
    return false;
  }
};

module.exports = { enviarCorreoRecuperacion, enviarCorreoInvitacionPassword };
