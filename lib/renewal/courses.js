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
  // Duración en `meses` o en `dias` (Level Express). Si una oferta coincide con
  // varias entradas gana el fragmento más largo.
  { key: 'directo-express', nombre: 'Directo al Aptis Express', meses: 6, ofertasKajabi: ['Directo al Aptis Express', 'Directos al Aptis Express'] },
  { key: 'directo-express-tutorizado', nombre: 'Directo al Aptis Express Tutorizado', meses: 6, ofertasKajabi: ['Directo al Aptis Express Tutorizado'] },
  { key: 'directo', nombre: 'Directo al Aptis', meses: 12, ofertasKajabi: ['Directo al Aptis', 'Directos al Aptis'] },
  { key: 'directo-tutorizado', nombre: 'Directo al Aptis Tutorizado', meses: 12, ofertasKajabi: ['Directo al Aptis Tutorizado'] },
  { key: 'expert', nombre: 'Aptis Expert', meses: 6, ofertasKajabi: ['Aptis Expert'] },
  { key: 'expert-express', nombre: 'Aptis Expert Express', meses: 6, ofertasKajabi: ['Aptis Expert Express'] },
  { key: 'expert-express-tutorizado', nombre: 'Aptis Expert Express Tutorizado', meses: 6, ofertasKajabi: ['Aptis Expert Express Tutorizado'] },
  { key: 'expert-tutorizado', nombre: 'Aptis Expert Tutorizado', meses: 6, ofertasKajabi: ['Aptis Expert Tutorizado'] },
  { key: 'accelerator', nombre: 'Aptis Accelerator', meses: 4, ofertasKajabi: ['Aptis Accelerator', 'Accelerator Lite', 'Accelerator Plus'] },
  { key: 'level', nombre: 'Aptis Level', meses: 3, ofertasKajabi: ['Aptis Level', 'Aptis Level - Policía Nacional', 'Aptis Level - Policia Nacional'] },
  { key: 'level-express', nombre: 'Aptis Level Express', dias: 50, ofertasKajabi: ['Aptis Level Express'] },
  // Ten tu Aptis tiene dos accesos. Si la oferta no indica los meses se asume la de 4.
  { key: 'ten-tu-aptis-4m', nombre: 'Ten tu Aptis (4 meses)', meses: 4, ofertasKajabi: ['Ten tu Aptis 4 meses', 'Ten tu Aptis 4', 'Ten tu Aptis'] },
  { key: 'ten-tu-aptis-8m', nombre: 'Ten tu Aptis (8 meses)', meses: 8, ofertasKajabi: ['Ten tu Aptis 8 meses', 'Ten tu Aptis 8'] },
];

/** Duración de un curso como { meses } o { dias }. */
export function duracionCurso(curso) {
  if (!curso) return null;
  return curso.dias ? { dias: curso.dias } : { meses: curso.meses };
}

/** "6 meses" / "50 días" */
export function duracionTexto({ meses, dias } = {}) {
  if (dias) return `${dias} días`;
  if (meses) return meses === 1 ? '1 mes' : `${meses} meses`;
  return '';
}

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

/**
 * Detecta una oferta de renovación por su nombre y deduce cuánto amplía:
 * "mensual" → 1 mes, "anual" → 12, "cada 6 meses" / "6 meses" → 6,
 * "50 días" → 50 días. Si el nombre no dice cuánto, usa el catálogo de
 * ofertas de renovación (RENEWAL_*). Devuelve null si no es una renovación.
 */
export function buscarRenovacionPorOferta(nombreOferta, env = process.env) {
  const n = normalizar(nombreOferta);
  if (!n || !n.includes('renovaci')) return null;
  const catalogo = getOfertasRenovacion(env).find((o) => coincide(nombreOferta, o.ofertasKajabi));
  const base = { key: 'renovacion', etiqueta: 'Renovación', nombre: String(nombreOferta || '').trim() };
  if (/\bmensual\b/.test(n)) return { ...base, meses: 1 };
  if (/\banual\b/.test(n)) return { ...base, meses: 12 };
  const dias = /(\d+)\s*dias?\b/.exec(n);
  if (dias) return { ...base, dias: Number(dias[1]) };
  const meses = /(\d+)\s*mes(es)?\b/.exec(n);
  if (meses) return { ...base, meses: Number(meses[1]) };
  if (/\bano\b/.test(n)) return { ...base, meses: 12 };
  return catalogo ? { ...catalogo, nombre: base.nombre } : null;
}
