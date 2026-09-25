import { procesarSecuencia } from '../../../lib/renewal/logic.js';
import { isAuthorized, json } from '../../../lib/auth.js';
import { origenDe, registrarEjecucion } from '../../../lib/renewal/runlog.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Proceso diario de la secuencia de renovación (cron de Vercel).
 * GET /api/renewal-sequence          → envía los emails que toquen hoy
 * GET /api/renewal-sequence?dry=1    → simula sin enviar ni escribir
 * GET /api/renewal-sequence?hoy=YYYY-MM-DD → simula como si fuera otro día (solo con dry=1)
 * GET /api/renewal-sequence?max=1     → envía como máximo N emails (para pruebas)
 */
export async function GET(req) {
  if (!isAuthorized(req)) return json({ success: false, error: 'Unauthorized' }, 401);
  const inicio = Date.now();
  const origen = origenDe(req);

  try {
    const url = new URL(req.url);
    const dryRun = ['1', 'true'].includes(url.searchParams.get('dry') || '');
    const hoy = dryRun ? url.searchParams.get('hoy') || undefined : undefined;

    const max = parseInt(url.searchParams.get('max') || '', 10) || null;
    const result = await procesarSecuencia({ dryRun, hoy, max });
    if (!dryRun) await registrarEjecucion({ endpoint: 'renewal-sequence', origen, inicio, resumen: result });

    return json({
      success: true,
      message: dryRun ? 'Simulación de secuencia de renovación' : 'Secuencia de renovación procesada',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Renewal sequence error:', error);
    await registrarEjecucion({ endpoint: 'renewal-sequence', origen, inicio, error });
    return json({ success: false, error: error.message, timestamp: new Date().toISOString() }, 500);
  }
}
