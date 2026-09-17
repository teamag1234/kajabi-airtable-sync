import { getKajabiPayments, getKajabiCustomer, getKajabiOrders } from './kajabi.js';
import { createOrUpdateRecord, getRecords } from './airtable.js';
import { sendPaymentReminder, sendFailedPaymentNotification } from './email.js';
import { buscarCursoPorOferta, buscarRenovacionPorOferta } from './renewal/courses.js';
import { altaRenovacion, aplicarRenovacion } from './renewal/logic.js';

/** Nombre de la oferta comprada, probando los campos que puede traer Kajabi. */
function nombreOferta(payment, orders) {
  const candidatos = [
    payment.offer_title,
    payment.offer_name,
    payment.offer && payment.offer.title,
    payment.product_title,
    payment.product_name,
    payment.description,
  ];
  for (const order of orders || []) {
    if (order.id === payment.order_id || orders.length === 1) {
      candidatos.push(order.offer_title, order.offer_name, order.offer && order.offer.title, order.product_title);
    }
  }
  return candidatos.find((c) => typeof c === 'string' && c.trim()) || '';
}

/**
 * Si el pago corresponde a un curso principal da de alta al alumno en la tabla
 * de renovaciones; si corresponde a una oferta de renovación amplía su acceso.
 * Nunca hace fallar el sync: los errores se registran y se sigue.
 */
async function registrarRenovacionDesdePago(payment, customer, orders) {
  const oferta = nombreOferta(payment, orders);
  if (!oferta) return { accion: 'sin-oferta' };
  const fecha = new Date(payment.created_at).toISOString().split('T')[0];
  const nombre = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();

  const renovacion = buscarRenovacionPorOferta(oferta);
  if (renovacion) {
    return aplicarRenovacion({ email: customer.email, meses: renovacion.meses, fecha });
  }
  const curso = buscarCursoPorOferta(oferta);
  if (curso) {
    return altaRenovacion({ email: customer.email, nombre, curso: curso.key, fechaInicio: fecha, origen: 'kajabi-sync' });
  }
  return { accion: 'oferta-no-catalogada', oferta };
}

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

        try {
          const r = await registrarRenovacionDesdePago(payment, customer, orders);
          if (r.accion !== 'sin-oferta') console.log(`Renovaciones (${customer.email}):`, r.accion, r.oferta || '');
        } catch (renewalError) {
          console.error(`Error registrando renovación para ${customer.email}:`, renewalError.message);
        }

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
