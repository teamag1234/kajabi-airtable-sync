import { detectarAltasManuales } from '../../../lib/renewal/grants.js';
import { isAuthorized, json } from '../../../lib/auth.js';
import { origenDe, registrarEjecucion } from '../../../lib/renewal/runlog.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Detección diaria de accesos concedidos a mano en Kajabi (cron).
 * GET /api/renewal-grants          → da de alta los accesos nuevos
 * GET /api/renewal-grants?dry=1    → simula
 */
export async function GET(req) {
  if (!isAuthorized(req)) return json({ success: false, error: 'Unauthorized' }, 401);
  const inicio = Date.now();
  const origen = origenDe(req);
  try {
    const url = new URL(req.url);
    const dryRun = ['1', 'true'].includes(url.searchParams.get('dry') || '');
    const result = await detectarAltasManuales({ dryRun });
    result.detalle = result.detalle.filter((d) => d.accion !== 'ignorado');
    await registrarEjecucion({ endpoint: 'renewal-grants', origen, inicio, resumen: result });
    return json({ success: result.errores === 0, data: result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Renewal grants error:', error);
    await registrarEjecucion({ endpoint: 'renewal-grants', origen, inicio, error });
    return json({ success: false, error: error.message, timestamp: new Date().toISOString() }, 500);
  }
}
