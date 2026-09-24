import { createOrUpdateRecord, getRecords, updateRecord, escapeFormulaValue } from '../../../lib/airtable.js';
import { filaConMensaje, filaDesdeClic, TABLA_TEST } from '../../../lib/level-test/lead.js';
import { camposMensaje } from '../../../lib/level-test/mensaje.js';
import { altaEnKajabi, describirError } from '../../../lib/level-test/kajabi.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

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

/**
 * Leads del test de nivel de la web (kajabi/test-nivel.html). Es público: lo
 * llama el navegador del alumno con sendBeacon (text/plain con JSON dentro).
 *   { evento: 'test', nombre, email, telefono, perfil, respuestas, atribucion }
 *     → crea o actualiza la fila del email en la tabla "Test de nivel"
 *   { evento: 'clic', email, curso, conDescuento }
 *     → anota en esa fila en qué oferta ha hecho clic
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

  const tabla = TABLA_TEST();
  try {
    if (body.evento === 'clic') {
      const fila = filaDesdeClic(body);
      if (fila.error) return responder(req, { ok: false, error: fila.error }, 400);
      const [registro] = await getRecords(tabla, `LOWER({Email}) = "${escapeFormulaValue(fila.email)}"`, { maxRecords: 1 });
      // El mensaje del closer se reescribe para mencionar el curso que ha mirado.
      if (registro) {
        const campos = { ...fila.fields, ...camposMensaje({ ...registro.fields, ...fila.fields }) };
        await updateRecord(tabla, registro.id, campos, { typecast: true });
      }
      return responder(req, { ok: true, actualizado: Boolean(registro) });
    }

    const fila = filaConMensaje(body);
    if (fila.error) return responder(req, { ok: false, error: fila.error }, 400);
    // Una fila por persona: si repite el test se actualiza con el último resultado.
    const registro = await createOrUpdateRecord(tabla, fila.fields, `LOWER({Email}) = "${escapeFormulaValue(fila.email)}"`, { typecast: true });

    // Alta en Kajabi (formulario "Test de nivel" + etiqueta de nivel). Si falla,
    // el lead ya está en Airtable: se anota el motivo en la fila y seguimos.
    let kajabi;
    try {
      kajabi = await altaEnKajabi({ nombre: fila.fields.Nombre, email: fila.email, telefono: fila.fields['Teléfono'], nivel: fila.resultado.nivel });
    } catch (error) {
      kajabi = describirError(error);
      console.error('Error dando de alta en Kajabi:', error.response?.data || error.message);
    }
    try {
      await updateRecord(tabla, registro.id, { Kajabi: kajabi });
    } catch (error) {
      console.error('Error anotando el alta de Kajabi:', error.message);
    }
    return responder(req, { ok: true, nivel: fila.resultado.nivel, nota: fila.resultado.nota, curso: fila.recomendacion.curso, kajabi });
  } catch (error) {
    console.error('Error guardando test de nivel:', error.response?.data || error.message);
    return responder(req, { ok: false, error: 'No se pudo guardar' }, 500);
  }
}
