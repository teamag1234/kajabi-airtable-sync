import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Transporte SMTP. Si hay EMAIL_HOST se usa un servidor SMTP genérico (Brevo,
 * Resend, Postmark, etc.); si no, el servicio de nodemailer (gmail por defecto).
 */
function initTransporter() {
  if (transporter) return transporter;

  const auth = {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  };

  if (process.env.EMAIL_HOST) {
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port,
      secure: process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === 'true' : port === 465,
      auth,
    });
  } else {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth,
    });
  }

  return transporter;
}

function fromAddress() {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const name = process.env.EMAIL_FROM_NAME;
  return name ? `"${name}" <${from}>` : from;
}

/** Envío genérico. Devuelve el resultado de nodemailer. */
export async function sendEmail({ to, subject, html, text, replyTo }) {
  const transporter = initTransporter();
  const mailOptions = {
    from: fromAddress(),
    to,
    subject,
    html,
    text,
    replyTo: replyTo || process.env.EMAIL_REPLY_TO || undefined,
  };
  const result = await transporter.sendMail(mailOptions);
  console.log('Email sent to:', to, '|', subject);
  return result;
}

export async function sendPaymentReminder(studentEmail, studentName, amount, dueDate) {
  try {
    return await sendEmail({
      to: studentEmail,
      subject: `Recordatorio: Pago pendiente de ${amount}€`,
      html: `
        <h2>¡Hola ${studentName}!</h2>
        <p>Le escribimos para recordarle que tiene un pago pendiente de:</p>
        <h3 style="color: #2563eb;">${amount}€</h3>
        <p><strong>Fecha de vencimiento:</strong> ${dueDate}</p>
        <p>Por favor, realice el pago lo antes posible para continuar con su acceso al curso.</p>
        <p>Gracias,<br/>El equipo</p>
      `,
    });
  } catch (error) {
    console.error('Error sending payment reminder:', error.message);
    throw error;
  }
}

export async function sendFailedPaymentNotification(studentEmail, studentName, amount) {
  try {
    return await sendEmail({
      to: studentEmail,
      subject: `Aviso: Problema con tu pago de ${amount}€`,
      html: `
        <h2>¡Hola ${studentName}!</h2>
        <p>Hemos detectado que tu pago de <strong>${amount}€</strong> ha fallado.</p>
        <p>Por favor, intenta realizar el pago nuevamente lo antes posible.</p>
        <p>Gracias,<br/>El equipo</p>
      `,
    });
  } catch (error) {
    console.error('Error sending failed payment notification:', error.message);
    throw error;
  }
}
