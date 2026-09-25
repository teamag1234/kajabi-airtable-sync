import { createRecord } from '../airtable.js';

export const TABLA_EJECUCIONES = () => process.env.AIRTABLE_RUNS_TABLE || 'Ejecuciones';

/** Origen de la llamada: los crons de Vercel se identifican por su user-agent. */
export function origenDe(req) {
  const ua = (req && req.headers && req.headers.get('user-agent')) || '';
  return /vercel-cron/i.test(ua) ? 'cron' : 'manual';
}

/**
 * Apunta una ejecución en la tabla Ejecuciones. Nunca lanza: si Airtable
 * falla, se registra en consola y se sigue.
 */
export async function registrarEjecucion({ endpoint, origen, inicio, resumen, error }) {
  const fin = Date.now();
  const r = resumen || {};
  const campos = {
    'Ejecución': `${endpoint} ${new Date(inicio).toISOString().slice(0, 16).replace('T', ' ')}`,
    'Endpoint': endpoint,
    'Inicio': new Date(inicio).toISOString(),
    'Duración (s)': Math.round((fin - inicio) / 100) / 10,
    'Origen': origen,
    'Resultado': error ? 'Error' : 'OK',
    'Enviados': r.enviados ?? null,
    'Creados': r.creados ?? r.importados ?? null,
    'Actualizados': r.actualizados ?? null,
    'Errores': error ? 1 : (r.errores ?? null),
    'Resumen': error ? String(error.message || error) : JSON.stringify({ ...r, detalle: undefined }).slice(0, 5000),
  };
  try {
    await createRecord(TABLA_EJECUCIONES(), campos, { typecast: true });
  } catch (e) {
    console.error('No se pudo registrar la ejecución:', e.message);
  }
}
