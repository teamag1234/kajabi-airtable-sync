import { getKajabiPayments, getKajabiCustomer, getKajabiOrders } from './kajabi.js';
import { createOrUpdateRecord, getRecords } from './airtable.js';
import { sendPaymentReminder, sendFailedPaymentNotification } from './email.js';

export async function syncKajabiToAirtable() {
  try {
    console.log('Starting Kajabi to Airtable sync...');

    const payments = await getKajabiPayments(1);
    console.log(`Found ${payments.length} new payments to sync`);

    let synced = 0;
    let errors = 0;

    for (const payment of payments) {
      try {
        const customer = await getKajabiCustomer(payment.customer_id);
        const orders = await getKajabiOrders(payment.customer_id);

        const studentFields = {
          'Nombre': customer.first_name + ' ' + customer.last_name,
          'Email': customer.email,
          'Teléfono': customer.phone || '',
          'Fecha de inscripción': new Date(customer.created_at).toISOString().split('T')[0],
        };

        await createOrUpdateRecord('tblgpDhBxDXbsrn6u', studentFields, `{Email} = "${customer.email}"`);

        const month = new Date(payment.created_at).toLocaleString('es-ES', { month: 'long' });
        const paymentFields = {
          'Alumno': customer.first_name + ' ' + customer.last_name,
          'Email': customer.email,
          'Importe': payment.amount / 100,
          'Mes': month,
          'Estado de pago': 'Pagado',
          'Fecha del pago': new Date(payment.created_at).toISOString().split('T')[0],
          'Número de cuota': orders.length || 1,
          'Referencia Kajabi': payment.id,
        };

        await createOrUpdateRecord('tblgpDhBxDXbsrn6u', paymentFields, `{Referencia Kajabi} = "${payment.id}"`);

        synced++;
      } catch (error) {
        console.error(`Error syncing payment ${payment.id}:`, error.message);
        errors++;
      }
    }

    console.log(`Sync completed: ${synced} payments synced, ${errors} errors`);
    return { synced, errors, total: payments.length };
  } catch (error) {
    console.error('Error in syncKajabiToAirtable:', error.message);
    throw error;
  }
}

export async function checkFailedPayments() {
  try {
    console.log('Checking for failed payments...');

    const inProgressRecords = await getRecords('tblgpDhBxDXbsrn6u', '{Estado de pago} = "En marcha"');

    let checked = 0;
    let reminded = 0;

    const reminderDays = parseInt(process.env.PAYMENT_REMINDER_DAYS || 3);

    for (const record of inProgressRecords) {
      const fields = record.fields;
      const paymentDate = new Date(fields['Fecha del pago'] || new Date());
      const daysSincePayment = Math.floor((new Date() - paymentDate) / (1000 * 60 * 60 * 24));

      if (daysSincePayment > reminderDays) {
        try {
          await sendPaymentReminder(
            fields['Email'],
            fields['Alumno'],
            fields['Importe'],
            fields['Fecha del pago']
          );

          reminded++;
        } catch (error) {
          console.error(`Error sending reminder for ${fields.Alumno}:`, error.message);
        }
      }

      checked++;
    }

    console.log(`Payment check completed: ${checked} checked, ${reminded} reminders sent`);
    return { checked, reminded };
  } catch (error) {
    console.error('Error in checkFailedPayments:', error.message);
    throw error;
  }
}

export async function checkFailedTransactions() {
  try {
    console.log('Checking for failed transactions...');

    const unpaidRecords = await getRecords('tblgpDhBxDXbsrn6u', '{Estado de pago} = "Sin pagar"');

    let notified = 0;

    for (const record of unpaidRecords) {
      const fields = record.fields;

      try {
        await sendFailedPaymentNotification(
          fields['Email'],
          fields['Alumno'],
          fields['Importe']
        );

        await createOrUpdateRecord('tblgpDhBxDXbsrn6u', {
          'Notificación enviada': new Date().toISOString().split('T')[0],
        }, `{Email} = "${fields['Email']}"`);

        notified++;
      } catch (error) {
        console.error(`Error notifying ${fields.Alumno}:`, error.message);
      }
    }

    console.log(`Failed transaction check completed: ${notified} notifications sent`);
    return { notified };
  } catch (error) {
    console.error('Error in checkFailedTransactions:', error.message);
    throw error;
  }
}
