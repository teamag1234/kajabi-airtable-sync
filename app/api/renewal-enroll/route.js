import { altaRenovacion, aplicarRenovacion, actualizarEstadoAlumno } from '../../../lib/renewal/logic.js';
import { isAuthorized, json } from '../../../lib/auth.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Alta de alumnos en la secuencia de renovación (n8n, Zapier, webhook de Kajabi).
 * POST /api/renewal-enroll
 * Body: { email, nombre, curso, fecha_inicio, meses? }  o un array de esos objetos.
 *   - curso: key del catálogo (aptis-6m), nombre del curso o nombre de la oferta de Kajabi
 *   - fecha_inicio: YYYY-MM-DD (fecha de compra)
 *   - meses: solo necesario si el curso no está en el catálogo
 */
export async function POST(req) {
  if (!isAuthorized(req)) return json({ success: false, error: 'Unauthorized' }, 401);

  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];
    const resultados = [];

    for (const item of items) {
      try {
        const r = await altaRenovacion({
          email: item.email,
          nombre: item.nombre || item.name,
          curso: item.curso || item.course || item.oferta || item.offer,
          fechaInicio: item.fecha_inicio || item.fechaInicio || item.start_date,
          meses: item.meses || item.months,
          origen: item.origen || 'api',
        });
        resultados.push({ email: item.email, ...r });
      } catch (error) {
        resultados.push({ email: item.email, accion: 'error', motivo: error.message });
      }
    }

    const errores = resultados.filter((r) => r.accion === 'error').length;
    return json({ success: errores === 0, data: resultados, timestamp: new Date().toISOString() }, errores === resultados.length ? 400 : 200);
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
  }
}

/**
 * Cambios de estado de un alumno.
 * PATCH /api/renewal-enroll
 * Body: { email, curso?, aprobado?: boolean, pausar?: boolean }
 *   o   { email, curso?, renovar: { meses, fecha? } }  → amplía el acceso y reinicia la secuencia
 */
export async function PATCH(req) {
  if (!isAuthorized(req)) return json({ success: false, error: 'Unauthorized' }, 401);

  try {
    const body = await req.json();
    let result;
    if (body.renovar) {
      result = await aplicarRenovacion({ email: body.email, curso: body.curso, meses: body.renovar.meses, fecha: body.renovar.fecha });
    } else {
      result = await actualizarEstadoAlumno({ email: body.email, curso: body.curso, aprobado: body.aprobado, pausar: body.pausar });
    }
    return json({ success: result.accion !== 'no-encontrado', data: result, timestamp: new Date().toISOString() }, result.accion === 'no-encontrado' ? 404 : 200);
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
  }
}
