import { importarDesdeKajabi } from '../../../lib/renewal/import.js';
import { isAuthorized, json } from '../../../lib/auth.js';
import { hoyMadrid, sumarDias } from '../../../lib/renewal/dates.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Importación de accesos desde Kajabi (cron diario, incremental).
 * GET /api/renewal-import               → compras actualizadas en los últimos 3 días
 * GET /api/renewal-import?dry=1         → simula sin escribir
 * GET /api/renewal-import?desde=YYYY-MM-DD&completo=1 → recorre por fecha de creación desde esa fecha
 * Tras las compras revisa también los accesos concedidos a mano en Kajabi (grants=0 lo desactiva)
 */
export async function GET(req) {
  if (!isAuthorized(req)) return json({ success: false, error: 'Unauthorized' }, 401);
  try {
    const url = new URL(req.url);
    const dryRun = ['1', 'true'].includes(url.searchParams.get('dry') || '');
    const completo = ['1', 'true'].includes(url.searchParams.get('completo') || '');
    const desde = url.searchParams.get('desde') || (completo ? undefined : sumarDias(hoyMadrid(), -3));
    const altasManuales = !['0', 'false'].includes(url.searchParams.get('grants') || '');
    const result = await importarDesdeKajabi({ desde, incremental: !completo, dryRun, altasManuales });
    // El detalle completo puede ser largo: se devuelve resumido salvo en simulación
    if (!dryRun) result.detalle = result.detalle.filter((d) => d.accion !== 'sin-cambios');
    return json({ success: result.errores === 0, data: result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Renewal import error:', error);
    return json({ success: false, error: error.message, timestamp: new Date().toISOString() }, 500);
  }
}
