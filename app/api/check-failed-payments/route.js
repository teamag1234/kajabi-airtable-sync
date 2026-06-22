import { checkFailedPayments, checkFailedTransactions } from '../../lib/sync-logic.js';

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      if (process.env.CRON_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    const failedPayments = await checkFailedPayments();
    const failedTransactions = await checkFailedTransactions();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment check completed',
        data: {
          failedPayments,
          failedTransactions,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Check failed payments error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
