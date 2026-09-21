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
  // Nombres tomados de "TIPO DE CURSO" y "Offer" en la tabla CURSOS KAJABI.
  // Los meses marcados CONFIRMAR se han deducido de las fechas de la tabla;
  // ajústalos si no cuadran con el acceso real de la oferta en Kajabi.
  { key: 'directo-express', nombre: 'Directo al Aptis Express', meses: 3, ofertasKajabi: ['Directo al Aptis Express', 'Directos al Aptis Express'] }, // CONFIRMAR
  { key: 'directo-express-tutorizado', nombre: 'Directo al Aptis Express Tutorizado', meses: 6, ofertasKajabi: ['Directo al Aptis Express Tutorizado'] },
  { key: 'directo', nombre: 'Directo al Aptis', meses: 6, ofertasKajabi: ['Directo al Aptis', 'Directos al Aptis'] }, // CONFIRMAR
  { key: 'directo-tutorizado', nombre: 'Directo al Aptis Tutorizado', meses: 12, ofertasKajabi: ['Directo al Aptis Tutorizado'] },
  { key: 'directo-turbo-pro', nombre: 'Directo al Aptis Turbo Pro', meses: 4, ofertasKajabi: ['Directo al Aptis Turbo Pro'] },
  { key: 'expert', nombre: 'Aptis Expert', meses: 6, ofertasKajabi: ['Aptis Expert'] }, // CONFIRMAR
  { key: 'expert-express', nombre: 'Aptis Expert Express', meses: 3, ofertasKajabi: ['Aptis Expert Express'] }, // CONFIRMAR
  { key: 'expert-tutorizado', nombre: 'Aptis Expert Tutorizado', meses: 12, ofertasKajabi: ['Aptis Expert Tutorizado'] }, // CONFIRMAR
  { key: 'accelerator', nombre: 'Aptis Accelerator', meses: 3, ofertasKajabi: ['Aptis Accelerator', 'Accelerator Lite', 'Accelerator Plus'] }, // CONFIRMAR
  { key: 'level-policia', nombre: 'Aptis Level - Policía Nacional', meses: 3, ofertasKajabi: ['Aptis Level - Policía Nacional', 'Aptis Level - Policia Nacional', 'Aptis Level'] }, // CONFIRMAR
  { key: 'level-express', nombre: 'Aptis Level Express', meses: 3, ofertasKajabi: ['Aptis Level Express'] }, // CONFIRMAR
  { key: 'ten-tu-aptis', nombre: 'Ten tu Aptis', meses: 3, ofertasKajabi: ['Ten tu Aptis'] }, // CONFIRMAR
  { key: 'infinity', nombre: 'Aptis Infinity', meses: 12, ofertasKajabi: ['Aptis Infinity'] }, // CONFIRMAR
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
  { key: '6m', meses: 6, etiqueta: '6 meses más', envKey: '6M', ofertasKajabi: ['Renovación 6 meses', 'Renovacion 6 meses', 'Renovación cada 6 meses'] },
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

/** Longitud del fragmento más largo que aparece en el nombre de la oferta, o 0. */
function puntuacion(nombreOferta, fragmentos) {
  const n = normalizar(nombreOferta);
  if (!n) return 0;
  return fragmentos.reduce((max, f) => {
    const nf = normalizar(f);
    return nf && n.includes(nf) ? Math.max(max, nf.length) : max;
  }, 0);
}

function coincide(nombreOferta, fragmentos) {
  return puntuacion(nombreOferta, fragmentos) > 0;
}

/**
 * Devuelve el curso cuya oferta de Kajabi coincide con el nombre dado, o null.
 * Si varios coinciden gana el fragmento más largo, así "Directo al Aptis Express"
 * no se confunde con "Directo al Aptis".
 */
export function buscarCursoPorOferta(nombreOferta) {
  let mejor = null;
  let mejorPuntos = 0;
  for (const c of CURSOS) {
    const p = puntuacion(nombreOferta, c.ofertasKajabi);
    if (p > mejorPuntos) { mejor = c; mejorPuntos = p; }
  }
  return mejor;
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
