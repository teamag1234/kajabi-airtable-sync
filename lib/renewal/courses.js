/**
 * Catálogo de cursos principales y ofertas de renovación.
 *
 * CURSOS: cada entrada es un curso con acceso limitado. `meses` es la duración
 * del acceso y `ofertasKajabi` son los nombres (o fragmentos) de las ofertas de
 * Kajabi que dan acceso a ese curso. El sync de pagos usa esos nombres para
 * detectar la compra y dar de alta al alumno en la tabla de renovaciones.
 *
 * Rellena `nombre` y `ofertasKajabi` con los nombres reales de Kajabi. La
 * comparación no distingue mayúsculas ni acentos, y basta con que el nombre de
 * la oferta contenga el fragmento.
 */
export const CURSOS = [
  {
    key: 'aptis-3m',
    nombre: 'Curso APTIS 3 meses',
    meses: 3,
    ofertasKajabi: ['APTIS 3 meses', 'Acceso 3 meses'],
  },
  {
    key: 'aptis-4m',
    nombre: 'Curso APTIS 4 meses',
    meses: 4,
    ofertasKajabi: ['APTIS 4 meses', 'Acceso 4 meses'],
  },
  {
    key: 'aptis-6m',
    nombre: 'Curso APTIS 6 meses',
    meses: 6,
    ofertasKajabi: ['APTIS 6 meses', 'Acceso 6 meses', 'Directo al APTIS Express'],
  },
  {
    key: 'aptis-12m',
    nombre: 'Curso APTIS 1 año',
    meses: 12,
    ofertasKajabi: ['APTIS 12 meses', 'APTIS 1 año', 'Acceso anual'],
  },
];

/**
 * Ofertas de renovación. Precio y enlace de checkout salen de variables de
 * entorno para poder cambiarlos sin tocar código:
 *   RENEWAL_PRICE_1M / RENEWAL_URL_1M
 *   RENEWAL_PRICE_6M / RENEWAL_URL_6M
 *   RENEWAL_PRICE_12M / RENEWAL_URL_12M
 * `ofertasKajabi` sirve para que el sync detecte el pago de una renovación y
 * amplíe el acceso del alumno automáticamente.
 */
const RENOVACIONES_BASE = [
  { key: '1m', meses: 1, etiqueta: '1 mes más', envKey: '1M', ofertasKajabi: ['Renovación 1 mes', 'Renovacion 1 mes'] },
  { key: '6m', meses: 6, etiqueta: '6 meses más', envKey: '6M', ofertasKajabi: ['Renovación 6 meses', 'Renovacion 6 meses'] },
  { key: '12m', meses: 12, etiqueta: '1 año más', envKey: '12M', ofertasKajabi: ['Renovación 1 año', 'Renovacion 1 año', 'Renovación 12 meses'] },
];

export function getOfertasRenovacion(env = process.env) {
  return RENOVACIONES_BASE.map((o) => ({
    ...o,
    precio: env[`RENEWAL_PRICE_${o.envKey}`] || null,
    url: env[`RENEWAL_URL_${o.envKey}`] || env.RENEWAL_URL_DEFAULT || 'https://www.agacademyaptis.com',
  }));
}

export function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function coincide(nombreOferta, fragmentos) {
  const n = normalizar(nombreOferta);
  if (!n) return false;
  return fragmentos.some((f) => n.includes(normalizar(f)));
}

/** Devuelve el curso cuya oferta de Kajabi coincide con el nombre dado, o null. */
export function buscarCursoPorOferta(nombreOferta) {
  return CURSOS.find((c) => coincide(nombreOferta, c.ofertasKajabi)) || null;
}

/** Devuelve el curso por su key o por su nombre (sin distinguir acentos), o null. */
export function buscarCurso(keyONombre) {
  const n = normalizar(keyONombre);
  return CURSOS.find((c) => normalizar(c.key) === n || normalizar(c.nombre) === n) || null;
}

/** Devuelve la oferta de renovación cuya oferta de Kajabi coincide, o null. */
export function buscarRenovacionPorOferta(nombreOferta, env = process.env) {
  return getOfertasRenovacion(env).find((o) => coincide(nombreOferta, o.ofertasKajabi)) || null;
}
