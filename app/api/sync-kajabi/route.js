import { syncKajabiToAirtable } from '@/lib/sync-logic';

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      if (process.env.CRON_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    const result = await syncKajabiToAirtable();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync completed successfully',
        data: result,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Sync error:', error);

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
