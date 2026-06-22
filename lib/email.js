import nodemailer from 'nodemailer';

let transporter = null;

function initTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  return transporter;
}

export async function sendPaymentReminder(studentEmail, studentName, amount, dueDate) {
  try {
    const transporter = initTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
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
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Payment reminder email sent to:', studentEmail);
    return result;
  } catch (error) {
    console.error('Error sending payment reminder:', error.message);
    throw error;
  }
}

export async function sendFailedPaymentNotification(studentEmail, studentName, amount) {
  try {
    const transporter = initTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: studentEmail,
      subject: `Aviso: Problema con tu pago de ${amount}€`,
      html: `
        <h2>¡Hola ${studentName}!</h2>
        <p>Hemos detectado que tu pago de <strong>${amount}€</strong> ha fallado.</p>
        <p>Por favor, intenta realizar el pago nuevamente lo antes posible.</p>
        <p>Gracias,<br/>El equipo</p>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Failed payment notification sent to:', studentEmail);
    return result;
  } catch (error) {
    console.error('Error sending failed payment notification:', error.message);
    throw error;
  }
}
