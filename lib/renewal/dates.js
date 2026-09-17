/**
 * Utilidades de fechas. Todo se maneja como cadenas YYYY-MM-DD interpretadas
 * en hora peninsular (Europe/Madrid). Internamente se usan fechas UTC a
 * medianoche para que los cambios de hora no desplacen ningún cálculo.
 */
const DIA_MS = 24 * 60 * 60 * 1000;

export function hoyMadrid(now = new Date()) {
  // en-CA produce YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function parseISO(fecha) {
  if (fecha instanceof Date) {
    return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(fecha || ''));
  if (!m) throw new Error(`Fecha inválida: ${fecha}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function toISO(date) {
  return date.toISOString().slice(0, 10);
}

export function sumarDias(fecha, dias) {
  const d = parseISO(fecha);
  return toISO(new Date(d.getTime() + dias * DIA_MS));
}

/** Suma meses respetando el fin de mes (31 ene + 1 mes = 28/29 feb). */
export function sumarMeses(fecha, meses) {
  const d = parseISO(fecha);
  const dia = d.getUTCDate();
  const objetivo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, 1));
  const ultimoDia = new Date(Date.UTC(objetivo.getUTCFullYear(), objetivo.getUTCMonth() + 1, 0)).getUTCDate();
  objetivo.setUTCDate(Math.min(dia, ultimoDia));
  return toISO(objetivo);
}

/** Días enteros desde `desde` hasta `hasta` (positivo si hasta > desde). */
export function diferenciaDias(desde, hasta) {
  return Math.round((parseISO(hasta).getTime() - parseISO(desde).getTime()) / DIA_MS);
}

export const DIAS_VENTANA_RENOVACION = 7;

/**
 * Dadas fecha de inicio y meses de acceso devuelve fin de acceso y fecha
 * límite de renovación (7 días después del fin).
 */
export function calcularFechas(fechaInicio, meses) {
  const fechaFin = sumarMeses(fechaInicio, meses);
  const fechaLimite = sumarDias(fechaFin, DIAS_VENTANA_RENOVACION);
  return { fechaInicio: toISO(parseISO(fechaInicio)), fechaFin, fechaLimite };
}

/** "martes 22 de septiembre" */
export function formatearLargo(fecha) {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parseISO(fecha)).replace(',', '');
}

/** "22/09/2026" */
export function formatearCorto(fecha) {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parseISO(fecha));
}
