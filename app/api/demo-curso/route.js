import { createOrUpdateRecord, getRecords, updateRecord, escapeFormulaValue } from '../../../lib/airtable.js';
import { filaDesdeAlta, filaDesdeProgreso, filaDesdeClicDemo, filaDesdeWhatsAppDemo, TABLA_DEMO } from '../../../lib/demo-curso/lead.js';
import { altaEnKajabi, describirError } from '../../../lib/level-test/kajabi.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const FORMULARIO_DEMO = () => process.env.KAJABI_DEMO_FORM || 'Demo curso';
const ORIGENES = () => (process.env.LEVEL_TEST_ORIGINS || 'https://www.agacademyaptis.com,https://agacademyaptis.com')
  .split(',').map((o) => o.trim()).filter(Boolean);

function cors(req) {
  const origen = req.headers.get('origin') || '';
  return ORIGENES().includes(origen)
    ? { 'Access-Control-Allow-Origin': origen, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' }
    : {};
}

function responder(req, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(req) } });
}

export function OPTIONS(req) {
  return new Response(null, { status: 204, headers: cors(req) });
}

const FILAS = { progreso: filaDesdeProgreso, clic: filaDesdeClicDemo, whatsapp: filaDesdeWhatsAppDemo };

/**
 * Leads de la demo del curso (kajabi/demo-curso.html). Es público: lo llama el
 * navegador con sendBeacon (text/plain con JSON dentro).
 *   { evento: 'alta', nombre, email, telefono, hechas, leccion, atribucion }
 *     → crea o actualiza la fila del email en "Demo curso" y lo da de alta en Kajabi
 *   { evento: 'progreso', email, hechas, leccion }   → lecciones que lleva
 *   { evento: 'clic', email, curso }                  → curso que ha mirado al final
 *   { evento: 'whatsapp', email }                     → nos ha escrito con dudas
 */
export async function POST(req) {
  const origen = req.headers.get('origin');
  if (origen && !ORIGENES().includes(origen)) return responder(req, { ok: false, error: 'Origen no permitido' }, 403);

  let body;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return responder(req, { ok: false, error: 'JSON no válido' }, 400);
  }

  const tabla = TABLA_DEMO();
  try {
    if (FILAS[body.evento]) {
      const fila = FILAS[body.evento](body);
      if (fila.error) return responder(req, { ok: false, error: fila.error }, 400);
      const [registro] = await getRecords(tabla, `LOWER({Email}) = "${escapeFormulaValue(fila.email)}"`, { maxRecords: 1 });
      if (registro) await updateRecord(tabla, registro.id, fila.fields, { typecast: true });
      return responder(req, { ok: true, actualizado: Boolean(registro) });
    }

    const fila = filaDesdeAlta(body);
    if (fila.error) return responder(req, { ok: false, error: fila.error }, 400);
    const registro = await createOrUpdateRecord(tabla, fila.fields, `LOWER({Email}) = "${escapeFormulaValue(fila.email)}"`, { typecast: true });

    // Alta en Kajabi (formulario "Demo curso"). Si falla, el lead ya está en
    // Airtable: se anota el motivo en la fila y seguimos.
    let kajabi;
    try {
      kajabi = await altaEnKajabi({ nombre: fila.fields.Nombre, email: fila.email, telefono: fila.fields['Teléfono'] }, FORMULARIO_DEMO());
    } catch (error) {
      kajabi = describirError(error);
      console.error('Error dando de alta en Kajabi:', error.response?.data || error.message);
    }
    try {
      await updateRecord(tabla, registro.id, { Kajabi: kajabi });
    } catch (error) {
      console.error('Error anotando el alta de Kajabi:', error.message);
    }
    return responder(req, { ok: true, kajabi });
  } catch (error) {
    console.error('Error guardando lead de la demo:', error.response?.data || error.message);
    return responder(req, { ok: false, error: 'No se pudo guardar' }, 500);
  }
}
