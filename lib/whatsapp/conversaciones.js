import crypto from 'node:crypto';
import { getRecords, createRecord, updateRecord, escapeFormulaValue } from '../airtable.js';
import { TABLA_TEST } from '../level-test/lead.js';

/**
 * Estado del agente en Airtable:
 *  - Tabla "Test de nivel": campo `Agente` por lead (Activo / Closer al mando /
 *    Necesita closer) y `Teléfono WhatsApp` con el número desde el que escribe.
 *  - Tabla "Conversaciones agente": una fila por mensaje (solo se añaden filas,
 *    así dos webhooks a la vez no se pisan). Es el historial que lee el agente.
 */

export const TABLA_CONVERSACIONES = () => process.env.AIRTABLE_AGENT_TABLE || 'Conversaciones agente';

export const AGENTE = { activo: 'Activo', closer: 'Closer al mando', necesitaCloser: 'Necesita closer' };

/** Campos de la tabla de conversaciones, para scripts/create-level-test-table.mjs. */
export const CAMPOS_CONVERSACIONES = [
  { name: 'Ref', type: 'singleLineText' },
  { name: 'Email', type: 'email' },
  { name: 'Teléfono', type: 'singleLineText' },
  { name: 'Rol', type: 'singleSelect', options: { choices: ['Alumno', 'Agente', 'Closer'].map((name) => ({ name })) } },
  { name: 'Texto', type: 'multilineText' },
  { name: 'Fecha', type: 'dateTime', options: { dateFormat: { name: 'european' }, timeFormat: { name: '24hour' }, timeZone: 'Europe/Madrid' } },
  { name: 'Clave', type: 'singleLineText' },
];

const REF_RE = /\bTN[0-9A-Z]{7}\b/;

/** Referencia del test (TN…) dentro del texto que manda el alumno desde el botón. */
export function refEnTexto(texto) {
  const m = String(texto || '').toUpperCase().match(REF_RE);
  return m ? m[0] : null;
}

/** Clave única de un mensaje, para no procesarlo dos veces si Callbell reintenta. */
export function claveMensaje(payload) {
  const base = [payload?.contact?.uuid || payload?.from, payload?.createdAt, payload?.status, payload?.text].join('|');
  return crypto.createHash('sha1').update(base).digest('hex').slice(0, 20);
}

export async function leadPorRef(ref) {
  const [r] = await getRecords(TABLA_TEST(), `{Ref WhatsApp} = "${escapeFormulaValue(ref)}"`, { maxRecords: 1 });
  return r || null;
}

/** Lead del test que ya habló con el agente desde este teléfono. */
export async function leadPorTelefono(telefono) {
  const [r] = await getRecords(
    TABLA_TEST(),
    `AND({Teléfono WhatsApp} = "${escapeFormulaValue(telefono)}", {Agente} != "")`,
    { maxRecords: 1 },
  );
  return r || null;
}

export async function actualizarLead(id, fields) {
  return updateRecord(TABLA_TEST(), id, fields, { typecast: true });
}

export async function mensajeYaGuardado(clave) {
  const r = await getRecords(TABLA_CONVERSACIONES(), `{Clave} = "${escapeFormulaValue(clave)}"`, { maxRecords: 1 });
  return r.length > 0;
}

/** rol: 'Alumno' | 'Agente' | 'Closer' */
export async function guardarMensaje({ ref, email, telefono, rol, texto, clave, fecha = new Date() }) {
  return createRecord(TABLA_CONVERSACIONES(), {
    Ref: ref,
    Email: email || '',
    'Teléfono': telefono,
    Rol: rol,
    Texto: String(texto || '').slice(0, 5000),
    Fecha: fecha.toISOString(),
    Clave: clave || crypto.randomUUID().slice(0, 20),
  }, { typecast: true });
}

/** Historial de una conversación, del más antiguo al más reciente. */
export async function historial(ref) {
  const filas = await getRecords(TABLA_CONVERSACIONES(), `{Ref} = "${escapeFormulaValue(ref)}"`);
  return filas
    .map((f) => ({ rol: f.fields.Rol, texto: f.fields.Texto || '', fecha: f.fields.Fecha || f.createdTime, clave: f.fields.Clave }))
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
}
