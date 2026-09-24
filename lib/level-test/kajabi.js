import { kajabiGet, kajabiSend, KAJABI_API_BASE } from '../kajabi.js';
import { numeroWhatsApp } from './mensaje.js';

/**
 * Da de alta en Kajabi a quien termina el test enviando el formulario
 * "Test de nivel" por la API. Kajabi hace lo mismo que si lo rellenara en la
 * web: crea o actualiza el contacto y dispara las etiquetas, secuencias y
 * automatizaciones configuradas en ese formulario.
 */

export const FORMULARIO_TEST = () => process.env.KAJABI_LEVEL_TEST_FORM || 'Test de nivel';

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

// Se cachea mientras viva la función de Vercel.
let formularioCache = null;

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

/**
 * Envía el formulario. Devuelve un texto corto con lo que ha pasado, para
 * dejarlo en la fila de Airtable (campo "Kajabi").
 */
export async function altaEnKajabi({ nombre, email, telefono }) {
  const form = await buscarFormulario();
  const numero = numeroWhatsApp(telefono);
  await kajabiSend('post', `${KAJABI_API_BASE}/forms/${form.id}/submit`, {
    data: {
      type: 'form_submissions',
      attributes: { name: nombre || email.split('@')[0], email, ...(numero ? { phone_number: `+${numero}` } : {}) },
    },
  });
  return 'OK';
}

/** Texto de error legible para Airtable (sin volcar respuestas enteras). */
export function describirError(error) {
  const status = error.response?.status;
  const detalle = error.response?.data?.errors?.[0]?.detail || error.response?.data?.errors?.[0]?.title || error.message;
  const pista = status === 403 ? ' (la clave de la API no tiene permiso de escritura)' : '';
  return `Error${status ? ` ${status}` : ''}: ${String(detalle).slice(0, 150)}${pista}`;
}
