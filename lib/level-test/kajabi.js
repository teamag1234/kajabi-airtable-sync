import { kajabiGet, kajabiSend, KAJABI_API_BASE } from '../kajabi.js';
import { numeroWhatsApp } from './mensaje.js';

/**
 * Da de alta en Kajabi a quien termina el test enviando el formulario
 * "Test de nivel" por la API. Kajabi hace lo mismo que si lo rellenara en la
 * web: crea o actualiza el contacto y dispara las etiquetas, secuencias y
 * automatizaciones configuradas en ese formulario.
 *
 * Además le pone la etiqueta de su nivel (test-nivel-A1 … test-nivel-B2) si
 * existe en Kajabi: la API no permite crear etiquetas, solo asignarlas.
 */

export const FORMULARIO_TEST = () => process.env.KAJABI_LEVEL_TEST_FORM || 'Test de nivel';
export const etiquetaNivel = (nivel) => `test-nivel-${String(nivel).toLowerCase()}`;

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Se cachean mientras viva la función de Vercel.
let formularioCache = null;
let etiquetasCache = null;

async function todasLasPaginas(url, params) {
  const items = [];
  while (url) {
    const data = await kajabiGet(url, params);
    items.push(...(data.data || []));
    url = data.links?.next || null;
    params = undefined;
  }
  return items;
}

/** Busca el formulario por su título (sin distinguir mayúsculas ni acentos). */
export async function buscarFormulario(titulo = FORMULARIO_TEST()) {
  if (formularioCache && formularioCache.titulo === titulo) return formularioCache;
  const forms = await todasLasPaginas(`${KAJABI_API_BASE}/forms`, { 'page[size]': 100 });
  const form = forms.find((f) => normalizar(f.attributes?.title) === normalizar(titulo));
  if (!form) throw new Error(`No existe en Kajabi el formulario "${titulo}"`);
  formularioCache = { titulo, id: form.id, siteId: form.relationships?.site?.data?.id || null };
  return formularioCache;
}

async function idEtiqueta(nombre) {
  if (!etiquetasCache) {
    const tags = await todasLasPaginas(`${KAJABI_API_BASE}/contact_tags`, { 'filter[name_cont]': 'test-nivel', 'page[size]': 100 });
    etiquetasCache = new Map(tags.map((t) => [normalizar(t.attributes?.name), t.id]));
  }
  return etiquetasCache.get(normalizar(nombre)) || null;
}

/** Busca el contacto por email; recién creado puede tardar un momento en aparecer. */
async function buscarContacto(email, siteId) {
  for (let intento = 0; intento < 3; intento++) {
    const params = { 'filter[search]': email };
    if (siteId) params['filter[site_id]'] = siteId;
    const data = await kajabiGet(`${KAJABI_API_BASE}/contacts`, params);
    const contacto = (data.data || []).find((c) => normalizar(c.attributes?.email) === normalizar(email));
    if (contacto) return contacto;
    await esperar(1000);
  }
  return null;
}

/**
 * Envía el formulario y etiqueta el nivel. Devuelve un texto corto con lo que
 * ha pasado, para dejarlo en la fila de Airtable (campo "Kajabi").
 */
export async function altaEnKajabi({ nombre, email, telefono, nivel }) {
  const form = await buscarFormulario();
  const numero = numeroWhatsApp(telefono);
  await kajabiSend('post', `${KAJABI_API_BASE}/forms/${form.id}/submit`, {
    data: {
      type: 'form_submissions',
      attributes: { name: nombre || email.split('@')[0], email, ...(numero ? { phone_number: `+${numero}` } : {}) },
    },
  });

  const etiqueta = etiquetaNivel(nivel);
  const tagId = await idEtiqueta(etiqueta);
  if (!tagId) return `OK (sin etiqueta: crea "${etiqueta}" en Kajabi)`;

  const contacto = await buscarContacto(email, form.siteId);
  if (!contacto) return 'OK (contacto no encontrado para etiquetar)';
  await kajabiSend('post', `${KAJABI_API_BASE}/contacts/${contacto.id}/relationships/tags`, {
    data: [{ type: 'contact_tags', id: tagId }],
  });
  return `OK + ${etiqueta}`;
}

/** Texto de error legible para Airtable (sin volcar respuestas enteras). */
export function describirError(error) {
  const status = error.response?.status;
  const detalle = error.response?.data?.errors?.[0]?.detail || error.response?.data?.errors?.[0]?.title || error.message;
  const pista = status === 403 ? ' (la clave de la API no tiene permiso de escritura)' : '';
  return `Error${status ? ` ${status}` : ''}: ${String(detalle).slice(0, 150)}${pista}`;
}
