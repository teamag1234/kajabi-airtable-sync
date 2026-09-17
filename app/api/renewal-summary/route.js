import { resumenRenovaciones } from '../../../lib/renewal/logic.js';
import { isAuthorized, json } from '../../../lib/auth.js';

export const dynamic = 'force-dynamic';

/** Recuento de alumnos por estado para el dashboard. */
export async function GET(req) {
  if (!isAuthorized(req)) return json({ success: false, error: 'Unauthorized' }, 401);
  try {
    const data = await resumenRenovaciones();
    return json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (error) {
    return json({ success: false, error: error.message }, 500);
  }
}
