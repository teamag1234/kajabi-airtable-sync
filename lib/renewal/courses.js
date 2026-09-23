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
/**
 * Ofertas de renovación de Kajabi, todas de pago único (en el checkout se
 * puede fraccionar en 3 con Klarna). Cada curso lleva las suyas.
 */
const RENOVACIONES_DIRECTO = [
  { key: '1m', meses: 1, etiqueta: '1 mes más', precio: '97', url: 'https://www.agacademyaptis.com/offers/sKLnwNsW' },
  { key: '6m', meses: 6, etiqueta: '6 meses más', precio: '297', url: 'https://www.agacademyaptis.com/offers/ZT5ookpW' },
  { key: '12m', meses: 12, etiqueta: '1 año más', precio: '497', url: 'https://www.agacademyaptis.com/offers/uufBDohz' },
];
const RENOVACIONES_LEVEL = [
  { key: '50d', dias: 50, etiqueta: '50 días más', precio: '115', url: 'https://www.agacademyaptis.com/offers/Q9VPPyE9' },
  { key: '3m', meses: 3, etiqueta: '3 meses más', precio: '157', url: 'https://www.agacademyaptis.com/offers/oYtBCHbL' },
];
const RENOVACIONES_ACCELERATOR = [
  { key: '4m', meses: 4, etiqueta: '4 meses más', precio: '197', url: 'https://www.agacademyaptis.com/offers/WCpZNs4q' },
];

export const CURSOS = [
  // Nombres tomados de las ofertas de Kajabi. Duración en `meses` o en `dias`
  // (Level Express). Si una oferta coincide con varias entradas gana el
  // fragmento más largo. "Aptis Expert" ya no existe como curso: sus ofertas y
  // renovaciones dan acceso a Directo al Aptis.
  { key: 'directo-express', familia: 'directo', nombre: 'Directo al Aptis Express', meses: 6, ofertasKajabi: ['Directo al Aptis Express', 'Directos al Aptis Express'], renovaciones: RENOVACIONES_DIRECTO },
  { key: 'directo-express-tutorizado', familia: 'directo', nombre: 'Directo al Aptis Express Tutorizado', meses: 6, ofertasKajabi: ['Directo al Aptis Express Tutorizado'], renovaciones: RENOVACIONES_DIRECTO },
  { key: 'directo', familia: 'directo', nombre: 'Directo al Aptis', meses: 12, ofertasKajabi: ['Directo al Aptis', 'Directos al Aptis', 'Aptis Expert'], renovaciones: RENOVACIONES_DIRECTO },
  { key: 'directo-tutorizado', familia: 'directo', nombre: 'Directo al Aptis Tutorizado', meses: 12, ofertasKajabi: ['Directo al Aptis Tutorizado', 'Aptis Expert Tutorizado'], renovaciones: RENOVACIONES_DIRECTO },
  { key: 'accelerator', familia: 'accelerator', nombre: 'Aptis Accelerator', meses: 4, ofertasKajabi: ['Aptis Accelerator', 'Accelerator Lite', 'Accelerator Plus'], renovaciones: RENOVACIONES_ACCELERATOR },
  { key: 'level', familia: 'level', nombre: 'Aptis Level', meses: 3, ofertasKajabi: ['Aptis Level', 'Aptis Level - Policía Nacional', 'Aptis Level - Policia Nacional'], renovaciones: RENOVACIONES_LEVEL },
  { key: 'level-express', familia: 'level', nombre: 'Aptis Level Express', dias: 50, ofertasKajabi: ['Aptis Level Express'], renovaciones: RENOVACIONES_LEVEL },
  // Ten tu Aptis tiene dos accesos. Si la oferta no indica los meses se asume la de 4.
  // En Kajabi solo existe renovación mensual por suscripción, así que de momento no lleva ofertas.
  { key: 'ten-tu-aptis-4m', familia: 'ten-tu-aptis', nombre: 'Ten tu Aptis (4 meses)', meses: 4, ofertasKajabi: ['Ten tu Aptis 4 meses', 'Ten tu Aptis 4', 'Ten tu Aptis'], renovaciones: [] },
  { key: 'ten-tu-aptis-8m', familia: 'ten-tu-aptis', nombre: 'Ten tu Aptis (8 meses)', meses: 8, ofertasKajabi: ['Ten tu Aptis 8 meses', 'Ten tu Aptis 8'], renovaciones: [] },
];

/** Cursos de la misma familia (comparten renovaciones: Directo al Aptis y sus variantes, etc.). */
export function cursosDeFamilia(familia) {
  return CURSOS.filter((c) => c.familia === familia);
}

/** Busca una oferta de renovación por su key dentro de la familia del curso. */
export function ofertaRenovacionPorKey(curso, key) {
  return ofertasRenovacionDeCurso(curso).find((o) => o.key === key) || null;
}

/** Ofertas de renovación que ve un alumno de un curso (lista vacía si no hay). */
export function ofertasRenovacionDeCurso(curso) {
  return (curso && curso.renovaciones) || [];
}

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
 * "50 días" → 50 días. Devuelve null si no es una renovación o no dice cuánto.
 */
export function buscarRenovacionPorOferta(nombreOferta) {
  const n = normalizar(nombreOferta);
  if (!n || !n.includes('renovaci')) return null;
  const base = { key: 'renovacion', etiqueta: 'Renovación', nombre: String(nombreOferta || '').trim() };
  if (/\bmensual\b/.test(n)) return { ...base, meses: 1 };
  if (/\banual\b/.test(n)) return { ...base, meses: 12 };
  const dias = /(\d+)\s*dias?\b/.exec(n);
  if (dias) return { ...base, dias: Number(dias[1]) };
  const meses = /(\d+)\s*mes(es)?\b/.exec(n);
  if (meses) return { ...base, meses: Number(meses[1]) };
  if (/\bano\b/.test(n)) return { ...base, meses: 12 };
  return null;
}
