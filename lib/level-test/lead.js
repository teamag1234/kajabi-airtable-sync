import { camposMensaje } from './mensaje.js';
import { corregir, recomendarCurso, PREGUNTAS, PERFIL, SECCIONES, CURSOS_TEST } from './quiz.js';

export const TABLA_TEST = () => process.env.AIRTABLE_LEVEL_TEST_TABLE || 'Test de nivel';

const texto = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Texto legible de una opción de perfil ("oposiciones" → "Oposiciones docentes"). */
function etiquetaPerfil(clave, valor) {
  const op = PERFIL[clave]?.opciones.find((o) => o.valor === valor);
  return op ? op.texto : '';
}

/**
 * Valida lo que envía el widget y lo convierte en la fila de Airtable. La nota
 * se recalcula aquí a partir de las respuestas: no nos fiamos del navegador.
 * Devuelve { error } si falta algo imprescindible.
 */
export function filaDesdeTest(body, ahora = new Date()) {
  const email = texto(body.email, 120).toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: 'Email no válido' };

  const respuestas = Array.isArray(body.respuestas)
    ? PREGUNTAS.map((p, i) => (Number.isInteger(body.respuestas[i]) ? body.respuestas[i] : null))
    : [];
  const perfil = {
    para: texto(body.perfil?.para, 40),
    necesita: texto(body.perfil?.necesita, 40),
    cuando: texto(body.perfil?.cuando, 40),
  };
  const r = corregir(respuestas);
  const rec = recomendarCurso(perfil, r.nivel);
  const at = body.atribucion || {};
  const seccion = (k) => `${r.porSeccion[k].aciertos}/${r.porSeccion[k].total}`;

  return {
    email,
    resultado: r,
    recomendacion: rec,
    fields: {
      Email: email,
      Nombre: texto(body.nombre, 80),
      'Teléfono': texto(body.telefono, 20).replace(/[^\d+]/g, ''),
      'Para qué': etiquetaPerfil('para', perfil.para),
      'Nivel que necesita': etiquetaPerfil('necesita', perfil.necesita),
      'Cuándo se examina': etiquetaPerfil('cuando', perfil.cuando),
      Nivel: r.nivel,
      Nota: r.nota,
      Aciertos: r.aciertos,
      Porcentaje: r.porcentaje / 100,
      Writing: seccion('writing'),
      Reading: seccion('reading'),
      Grammar: seccion('grammar'),
      Vocabulary: seccion('vocab'),
      'Curso recomendado': CURSOS_TEST[rec.curso].nombre,
      Respuestas: respuestas.map((x) => (x == null ? '-' : 'ABCDEFGHIJ'[x])).join(''),
      'Fecha test': ahora.toISOString(),
      GCLID: texto(at.gclid, 200),
      'UTM source': texto(at.utm_source, 100),
      'UTM medium': texto(at.utm_medium, 100),
      'UTM campaign': texto(at.utm_campaign, 150),
      'UTM content': texto(at.utm_content, 150),
      'Página': texto(at.pagina, 300),
    },
  };
}

/** filaDesdeTest con el mensaje de WhatsApp para los closers ya escrito. */
export function filaConMensaje(body, ahora = new Date()) {
  const fila = filaDesdeTest(body, ahora);
  if (!fila.error) Object.assign(fila.fields, camposMensaje(fila.fields));
  return fila;
}

/** Clic en una oferta del resultado. */
export function filaDesdeClic(body, ahora = new Date()) {
  const email = texto(body.email, 120).toLowerCase();
  const curso = CURSOS_TEST[body.curso];
  if (!EMAIL_RE.test(email) || !curso) return { error: 'Clic no válido' };
  return {
    email,
    fields: {
      'Clic oferta': curso.nombre,
      'Clic con descuento': Boolean(body.conDescuento),
      'Fecha clic': ahora.toISOString(),
    },
  };
}

/** Campos de la tabla, para crearla con scripts/create-level-test-table.mjs. */
export const CAMPOS_TABLA = [
  { name: 'Email', type: 'email' },
  { name: 'Nombre', type: 'singleLineText' },
  { name: 'Teléfono', type: 'phoneNumber' },
  { name: 'Para qué', type: 'singleSelect', options: { choices: PERFIL.para.opciones.map((o) => ({ name: o.texto })) } },
  { name: 'Nivel que necesita', type: 'singleSelect', options: { choices: PERFIL.necesita.opciones.map((o) => ({ name: o.texto })) } },
  { name: 'Cuándo se examina', type: 'singleSelect', options: { choices: PERFIL.cuando.opciones.map((o) => ({ name: o.texto })) } },
  { name: 'Nivel', type: 'singleSelect', options: { choices: ['A1', 'A2', 'B1', 'B2'].map((name) => ({ name })) } },
  { name: 'Nota', type: 'number', options: { precision: 1 } },
  { name: 'Aciertos', type: 'number', options: { precision: 0 } },
  { name: 'Porcentaje', type: 'percent', options: { precision: 0 } },
  ...Object.values(SECCIONES).map((s) => ({ name: s.titulo, type: 'singleLineText' })),
  { name: 'Curso recomendado', type: 'singleSelect', options: { choices: Object.values(CURSOS_TEST).map((c) => ({ name: c.nombre })) } },
  { name: 'Clic oferta', type: 'singleSelect', options: { choices: Object.values(CURSOS_TEST).map((c) => ({ name: c.nombre })) } },
  { name: 'Clic con descuento', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },
  { name: 'Respuestas', type: 'singleLineText' },
  { name: 'Fecha test', type: 'dateTime', options: { dateFormat: { name: 'european' }, timeFormat: { name: '24hour' }, timeZone: 'Europe/Madrid' } },
  { name: 'Fecha clic', type: 'dateTime', options: { dateFormat: { name: 'european' }, timeFormat: { name: '24hour' }, timeZone: 'Europe/Madrid' } },
  { name: 'GCLID', type: 'singleLineText' },
  { name: 'UTM source', type: 'singleLineText' },
  { name: 'UTM medium', type: 'singleLineText' },
  { name: 'UTM campaign', type: 'singleLineText' },
  { name: 'UTM content', type: 'singleLineText' },
  { name: 'Página', type: 'url' },
  { name: 'Mensaje WhatsApp', type: 'multilineText' },
  { name: 'Enviar WhatsApp', type: 'url' },
  {
    name: 'Estado closer',
    type: 'singleSelect',
    options: { choices: ['Mensaje enviado', 'Ha respondido', 'Ha comprado', 'No interesado'].map((name) => ({ name })) },
  },
];
