import nodemailer from 'nodemailer';

const REQUIRED = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM', 'PUBLIC_WEB_URL'];

export const mailIsConfigured = () => REQUIRED.every((key) => Boolean(process.env[key]));

export function sendPasswordResetMail(to, token) {
  const url = new URL(process.env.PUBLIC_WEB_URL);
  url.searchParams.set('resetToken', token);

  const port = Number(process.env.SMTP_PORT);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });

  return transport.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: 'Recuperar contraseña - ContaImp',
    text:
      'Solicitaste restablecer tu contraseña de ContaImp. ' +
      `Abre este enlace (válido 15 minutos y una sola vez):\n${url}\n\n` +
      'Si no lo solicitaste, ignora este mensaje.',
  });
}
