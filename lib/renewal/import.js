import { getKajabiPurchases } from '../kajabi.js';
import { buscarCursoPorOfertaKajabi, buscarRenovacionPorOferta, duracionCurso } from './courses.js';
import { hoyMadrid, sumarDias, sumarMeses, diferenciaDias, DIAS_VENTANA_RENOVACION } from './dates.js';
import { altaRenovacion, actualizarEstadoAlumno } from './logic.js';

/** Fecha YYYY-MM-DD en hora peninsular a partir de un timestamp ISO. */
export function fechaMadrid(iso) {
  if (!iso) return null;
  return hoyMadrid(new Date(iso));
}

/**
 * Convierte una compra de Kajabi en un "acceso" de la tabla Renovaciones, o
 * devuelve { omitido: motivo } si no aplica.
 *
 * Reglas:
 *  - La oferta tiene que corresponder a un curso del catálogo: por nombre
 *    (título o interno) o porque da acceso a un producto principal de Kajabi
 *    (así entran también las ofertas gratuitas de transferencia o efectivo).
 *  - `deactivated_at` en Kajabi es la fecha programada de fin de acceso, así
 *    que se usa tal cual como fecha fin. Si no existe se calcula con el
 *    catálogo (o con los meses de la oferta de renovación).
 *  - Suscripciones activas (sin fecha fin) se omiten: el acceso sigue mientras paguen.
 *  - Solo entran accesos cuya fecha fin sea hoy - 7 días o posterior.
 */
export function mapearCompra({ purchase, offer, customer, hoy = hoyMadrid() }) {
  const a = purchase.attributes || {};
  const titulo = offer ? String(offer.attributes.title || '').trim() : '';
  const interno = offer ? String(offer.attributes.internal_title || '').trim() : '';
  if (!titulo && !interno) return { omitido: 'sin oferta' };

  const renovacion = buscarRenovacionPorOferta(titulo) || buscarRenovacionPorOferta(interno);
  const productos = [
    ...((offer && offer.relationships && offer.relationships.products && offer.relationships.products.data) || []),
    ...((purchase.relationships && purchase.relationships.products && purchase.relationships.products.data) || []),
  ].map((x) => x.id);
  const curso = buscarCursoPorOfertaKajabi({ titulo, interno, productos });
  if (!curso) return { omitido: 'oferta no catalogada', oferta: titulo || interno };

  const email = customer && String(customer.attributes.email || '').trim().toLowerCase();
  if (!email) return { omitido: 'sin email', oferta: titulo };

  const fechaInicio = fechaMadrid(a.effective_start_at || a.created_at);
  let fechaFin = fechaMadrid(a.deactivated_at);
  let fuenteFin = 'kajabi';

  if (!fechaFin) {
    if (a.payment_type === 'subscription') return { omitido: 'suscripción activa', oferta: titulo };
    const d = renovacion ? (renovacion.dias ? { dias: renovacion.dias } : { meses: renovacion.meses }) : duracionCurso(curso);
    if (!d) return { omitido: 'sin duración', oferta: titulo };
    fechaFin = d.dias ? sumarDias(fechaInicio, d.dias) : sumarMeses(fechaInicio, d.meses);
    fuenteFin = 'catalogo';
  }

  if (diferenciaDias(hoy, fechaFin) < -DIAS_VENTANA_RENOVACION) {
    return { omitido: 'acceso terminado fuera de ventana', oferta: titulo, fechaFin };
  }

  return {
    email,
    nombre: customer ? String(customer.attributes.name || '').trim() : '',
    cursoKey: curso.key,
    curso: curso.nombre,
    fechaInicio,
    fechaFin,
    familia: curso.familia,
    esRenovacion: Boolean(renovacion),
    oferta: titulo || interno,
    compraId: purchase.id,
    fechaCompra: fechaMadrid(a.created_at),
    importe: a.amount_in_cents != null ? a.amount_in_cents / 100 : null,
    fuenteFin,
  };
}

/** Agrupa accesos por alumno y familia de curso quedándose con el que termina más tarde. */
export function consolidarAccesos(accesos) {
  const porClave = new Map();
  for (const acc of accesos) {
    const clave = `${acc.email}|${acc.familia || acc.cursoKey}`;
    const actual = porClave.get(clave);
    if (!actual || diferenciaDias(actual.fechaFin, acc.fechaFin) > 0) porClave.set(clave, acc);
  }
  return [...porClave.values()];
}

/**
 * Importa desde Kajabi a la tabla Renovaciones.
 *  - desde: fecha mínima (YYYY-MM-DD) de creación (o actualización si
 *    incremental=true) de las compras a revisar.
 *  - dryRun: calcula sin escribir.
 *  - aprobados: Map email → fecha de examen (YYYY-MM-DD o null). Se marca
 *    Aprobado solo si la fecha de examen es posterior al inicio del acceso;
 *    sin fecha, se anota en Notas pero no se marca.
 */
export async function importarDesdeKajabi({ desde, incremental = false, dryRun = false, hoy = hoyMadrid(), aprobados = null, log = console.log } = {}) {
  const fechaDesde = desde || sumarMeses(hoy, -14);
  const { purchases, included } = await getKajabiPurchases({
    desde: fechaDesde,
    orden: incremental ? '-updated_at' : '-created_at',
    onPage: ({ pagina, acumuladas }) => log(`Kajabi: página ${pagina}, ${acumuladas} compras`),
  });

  const resumen = { hoy, desde: fechaDesde, incremental, dryRun, compras: purchases.length, candidatos: 0, creados: 0, actualizados: 0, sinCambios: 0, aprobadosMarcados: 0, errores: 0, omitidos: {}, porCurso: {}, detalle: [] };

  const accesos = [];
  for (const purchase of purchases) {
    const offer = included.get(`offers:${purchase.relationships?.offer?.data?.id}`);
    const customer = included.get(`customers:${purchase.relationships?.customer?.data?.id}`);
    const r = mapearCompra({ purchase, offer, customer, hoy });
    if (r.omitido) {
      const k = r.omitido === 'oferta no catalogada' ? `no catalogada: ${r.oferta}` : r.omitido;
      resumen.omitidos[k] = (resumen.omitidos[k] || 0) + 1;
      continue;
    }
    accesos.push(r);
  }

  const consolidados = consolidarAccesos(accesos);
  resumen.candidatos = consolidados.length;
  for (const acc of consolidados) resumen.porCurso[acc.curso] = (resumen.porCurso[acc.curso] || 0) + 1;

  for (const acc of consolidados) {
    let notas = `Kajabi: ${acc.oferta} (compra ${acc.compraId}, fin según ${acc.fuenteFin})`;
    const fechaAprobado = aprobados && aprobados.has(acc.email) ? aprobados.get(acc.email) : undefined;
    const marcarAprobado = fechaAprobado !== undefined && fechaAprobado && diferenciaDias(acc.fechaInicio, fechaAprobado) >= 0;
    if (fechaAprobado !== undefined && !marcarAprobado) notas += ` · consta Aprobado en CURSOS KAJABI${fechaAprobado ? ` (${fechaAprobado}, anterior a este acceso)` : ' (sin fecha)'}`;
    if (dryRun) {
      resumen.detalle.push({ ...acc, accion: 'simulado' });
      continue;
    }
    try {
      const r = await altaRenovacion({ email: acc.email, nombre: acc.nombre, curso: acc.cursoKey, fechaInicio: acc.fechaInicio, fechaFin: acc.fechaFin, origen: 'kajabi-import', notas, esRenovacion: acc.esRenovacion, importe: acc.importe, oferta: acc.esRenovacion ? acc.oferta : null, fechaCompra: acc.fechaCompra });
      if (r.accion === 'creado') resumen.creados++;
      else if (r.accion === 'actualizado') resumen.actualizados++;
      else resumen.sinCambios++;
      if (marcarAprobado && r.accion !== 'sin-cambios') {
        await actualizarEstadoAlumno({ email: acc.email, curso: acc.cursoKey, aprobado: true });
        resumen.aprobadosMarcados++;
      }
      if (r.renovadoDesdeEmail) resumen.renovadosDesdeEmail = (resumen.renovadosDesdeEmail || 0) + 1;
      resumen.detalle.push({ email: acc.email, curso: acc.curso, fechaFin: acc.fechaFin, accion: r.accion, renovacion: acc.esRenovacion || undefined, desdeEmail: r.renovadoDesdeEmail || undefined });
      await new Promise((res) => setTimeout(res, 220));
    } catch (error) {
      resumen.errores++;
      resumen.detalle.push({ email: acc.email, curso: acc.curso, accion: 'error', motivo: error.message });
    }
  }

  log(`Importación Kajabi: ${resumen.compras} compras, ${resumen.candidatos} accesos, ${resumen.creados} creados, ${resumen.actualizados} actualizados, ${resumen.sinCambios} sin cambios, ${resumen.errores} errores`);
  return resumen;
}
