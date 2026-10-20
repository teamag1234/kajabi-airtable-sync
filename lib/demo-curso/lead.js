import { DEMO_LECCIONES } from './contenido.js';
import { CURSOS_TEST } from '../level-test/quiz.js';

export const TABLA_DEMO = () => process.env.AIRTABLE_DEMO_TABLE || 'Demo curso';

const texto = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const emailDe = (body) => texto(body.email, 120).toLowerCase();

/** Lecciones hechas que existen de verdad, sin repetir y en el orden del temario. */
function leccionesHechas(ids) {
  const set = new Set(Array.isArray(ids) ? ids.map(String) : []);
  return DEMO_LECCIONES.filter((l) => set.has(l.id));
}

function camposProgreso(body, ahora) {
  const hechas = leccionesHechas(body.hechas);
  const completada = hechas.length === DEMO_LECCIONES.length;
  const ultima = DEMO_LECCIONES.find((l) => l.id === body.leccion);
  return {
    'Lecciones hechas': hechas.length,
    ...(ultima ? { 'Última lección': ultima.titulo } : {}),
    ...(completada ? { 'Demo completada': true, 'Fecha completada': ahora.toISOString() } : {}),
  };
}

/**
 * Se ha registrado para desbloquear la demo. Devuelve { error } si falta algo
 * imprescindible.
 */
export function filaDesdeAlta(body, ahora = new Date()) {
  const email = emailDe(body);
  if (!EMAIL_RE.test(email)) return { error: 'Email no válido' };
  const at = body.atribucion || {};
  return {
    email,
    fields: {
      Email: email,
      Nombre: texto(body.nombre, 80),
      'Teléfono': texto(body.telefono, 20).replace(/[^\d+]/g, ''),
      'Fecha alta': ahora.toISOString(),
      ...camposProgreso(body, ahora),
      GCLID: texto(at.gclid, 200),
      'UTM source': texto(at.utm_source, 100),
      'UTM medium': texto(at.utm_medium, 100),
      'UTM campaign': texto(at.utm_campaign, 150),
      'UTM content': texto(at.utm_content, 150),
      'Página': texto(at.pagina, 300),
    },
  };
}

/** Ha terminado una lección. */
export function filaDesdeProgreso(body, ahora = new Date()) {
  const email = emailDe(body);
  if (!EMAIL_RE.test(email)) return { error: 'Email no válido' };
  return { email, fields: camposProgreso(body, ahora) };
}

/** Clic en un curso desde el final de la demo. */
export function filaDesdeClicDemo(body, ahora = new Date()) {
  const email = emailDe(body);
  const curso = CURSOS_TEST[body.curso];
  if (!EMAIL_RE.test(email) || !curso) return { error: 'Clic no válido' };
  return { email, fields: { 'Clic oferta': curso.nombre, 'Fecha clic': ahora.toISOString() } };
}

/** Pulsó "Tengo dudas" y se le abrió WhatsApp. */
export function filaDesdeWhatsAppDemo(body, ahora = new Date()) {
  const email = emailDe(body);
  if (!EMAIL_RE.test(email)) return { error: 'Email no válido' };
  return { email, fields: { 'Escribió por WhatsApp': true, 'Fecha WhatsApp': ahora.toISOString() } };
}

const FECHA = { dateFormat: { name: 'european' }, timeFormat: { name: '24hour' }, timeZone: 'Europe/Madrid' };
const CHECK = { icon: 'check', color: 'greenBright' };

/** Campos de la tabla, para crearla con scripts/create-level-test-table.mjs. */
export const CAMPOS_TABLA_DEMO = [
  { name: 'Email', type: 'email' },
  { name: 'Nombre', type: 'singleLineText' },
  { name: 'Teléfono', type: 'phoneNumber' },
  { name: 'Fecha alta', type: 'dateTime', options: FECHA },
  { name: 'Lecciones hechas', type: 'number', options: { precision: 0 } },
  { name: 'Última lección', type: 'singleSelect', options: { choices: DEMO_LECCIONES.map((l) => ({ name: l.titulo })) } },
  { name: 'Demo completada', type: 'checkbox', options: CHECK },
  { name: 'Fecha completada', type: 'dateTime', options: FECHA },
  { name: 'Clic oferta', type: 'singleSelect', options: { choices: Object.values(CURSOS_TEST).map((c) => ({ name: c.nombre })) } },
  { name: 'Fecha clic', type: 'dateTime', options: FECHA },
  { name: 'Escribió por WhatsApp', type: 'checkbox', options: CHECK },
  { name: 'Fecha WhatsApp', type: 'dateTime', options: FECHA },
  { name: 'GCLID', type: 'singleLineText' },
  { name: 'UTM source', type: 'singleLineText' },
  { name: 'UTM medium', type: 'singleLineText' },
  { name: 'UTM campaign', type: 'singleLineText' },
  { name: 'UTM content', type: 'singleLineText' },
  { name: 'Página', type: 'url' },
  { name: 'Kajabi', type: 'singleLineText' },
  {
    name: 'Estado closer',
    type: 'singleSelect',
    options: { choices: ['Mensaje enviado', 'Ha respondido', 'Ha comprado', 'No interesado'].map((name) => ({ name })) },
  },
];
