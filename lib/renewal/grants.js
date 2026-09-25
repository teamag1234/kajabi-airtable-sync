import { kajabiGet, KAJABI_API_BASE } from '../kajabi.js';
import { getRecords, createRecord } from '../airtable.js';
import { buscarCursoPorOfertaKajabi, buscarRenovacionPorOferta, buscarCurso } from './courses.js';
import { hoyMadrid } from './dates.js';
import { altaRenovacion, TABLA, F } from './logic.js';

export const TABLA_ALTAS = () => process.env.AIRTABLE_GRANTS_TABLE || 'Altas manuales Kajabi';
const SITE_ID = () => process.env.KAJABI_SITE_ID || '167072';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Descarga todos los clientes del sitio con las ofertas que tienen concedidas
 * ahora mismo (compradas o dadas a mano). Devuelve { customers, offers } con
 * offers como mapa id → oferta.
 */
export async function getKajabiCustomersConOfertas({ onPage } = {}) {
  const customers = [];
  const offers = new Map();
  let url = `${KAJABI_API_BASE}/customers`;
  let params = { 'filter[site_id]': SITE_ID(), include: 'offers', 'page[size]': 200 };
  let pagina = 0;
  while (url) {
    const data = await kajabiGet(url, params);
    pagina++;
    customers.push(...(data.data || []));
    for (const inc of data.included || []) if (inc.type === 'offers') offers.set(inc.id, inc);
    if (onPage) onPage({ pagina, acumulados: customers.length });
    url = data.links && data.links.next;
    params = undefined;
    await sleep(150);
  }
  return { customers, offers };
}

/**
 * Pares (cliente, oferta de curso) concedidos ahora mismo en Kajabi.
 * Las renovaciones no cuentan como alta.
 */
export function extraerAccesosConcedidos({ customers, offers }) {
  const accesos = [];
  for (const c of customers) {
    const email = String(c.attributes.email || '').trim().toLowerCase();
    if (!email) continue;
    for (const rel of (c.relationships && c.relationships.offers && c.relationships.offers.data) || []) {
      const o = offers.get(rel.id);
      if (!o) continue;
      const titulo = String(o.attributes.title || '').trim();
      const interno = String(o.attributes.internal_title || '').trim();
      if (buscarRenovacionPorOferta(titulo) || buscarRenovacionPorOferta(interno)) continue;
      const productos = ((o.relationships && o.relationships.products && o.relationships.products.data) || []).map((x) => x.id);
      const curso = buscarCursoPorOfertaKajabi({ titulo, interno, productos });
      if (!curso) continue;
      accesos.push({ clave: `${c.id}|${o.id}`, clienteId: c.id, ofertaId: o.id, email, nombre: String(c.attributes.name || '').trim(), oferta: titulo || interno, curso });
    }
  }
  return accesos;
}

/**
 * Detecta accesos concedidos a mano (sin compra) y los da de alta en
 * Renovaciones con fecha de inicio = hoy. Un par cliente|oferta ya apuntado en
 * la tabla de altas manuales (como Importado o Ignorado) no se vuelve a tocar,
 * y un alumno que ya tiene fila en Renovaciones para esa familia tampoco.
 *  - seedIgnorar = true: apunta todo lo que falte como Ignorado sin dar de alta
 *    (para la primera pasada, con el histórico sucio), salvo `excepto` (emails),
 *    y de esos solo la oferta que contenga `soloOfertaExcepto` si se indica.
 */
export async function detectarAltasManuales({ dryRun = false, hoy = hoyMadrid(), seedIgnorar = false, excepto = [], soloOfertaExcepto = null, log = console.log } = {}) {
  const datos = await getKajabiCustomersConOfertas({ onPage: ({ pagina, acumulados }) => log(`Kajabi clientes: página ${pagina}, ${acumulados}`) });
  const accesos = extraerAccesosConcedidos(datos);

  const conocidos = new Set((await getRecords(TABLA_ALTAS(), null, { fields: ['Clave'] })).map((r) => r.fields.Clave));
  const filas = await getRecords(TABLA(), null, { fields: [F.email, F.cursoKey, F.curso] });
  const enTabla = new Set(filas.map((r) => `${String(r.fields[F.email] || '').toLowerCase()}|${familiaDe(r.fields[F.cursoKey])}`));

  const resumen = { hoy, dryRun, seedIgnorar, clientes: datos.customers.length, accesos: accesos.length, nuevos: 0, importados: 0, ignorados: 0, errores: 0, detalle: [] };
  const exc = new Set(excepto.map((e) => String(e).toLowerCase()));

  for (const acc of accesos) {
    if (conocidos.has(acc.clave)) continue;
    const yaEnTabla = enTabla.has(`${acc.email}|${acc.curso.familia}`);
    resumen.nuevos++;
    const esExcepcion = exc.has(acc.email) && (!soloOfertaExcepto || acc.oferta.toLowerCase().includes(String(soloOfertaExcepto).toLowerCase()));
    const ignorar = yaEnTabla || (seedIgnorar && !esExcepcion);
    const registro = {
      Clave: acc.clave, Email: acc.email, Nombre: acc.nombre, Oferta: acc.oferta, Curso: acc.curso.nombre,
      'Cliente Kajabi': acc.clienteId, 'Oferta Kajabi': acc.ofertaId, Detectado: hoy,
      Estado: ignorar ? 'Ignorado' : 'Importado',
      Notas: yaEnTabla ? 'El alumno ya tenía fila en Renovaciones' : ignorar ? 'Acceso antiguo sin compra registrada; no se importa' : `Alta manual en Kajabi detectada el ${hoy}`,
    };
    if (dryRun) { resumen.detalle.push({ ...registro, accion: 'simulado' }); continue; }
    try {
      if (!ignorar) {
        await altaRenovacion({ email: acc.email, nombre: acc.nombre, curso: acc.curso.key, fechaInicio: hoy, origen: 'kajabi-grant', notas: `Kajabi: ${acc.oferta} (acceso concedido a mano, detectado el ${hoy}; fecha de inicio estimada)` });
        resumen.importados++;
      } else {
        resumen.ignorados++;
      }
      await createRecord(TABLA_ALTAS(), registro, { typecast: true });
      conocidos.add(acc.clave);
      if (!ignorar) enTabla.add(`${acc.email}|${acc.curso.familia}`);
      resumen.detalle.push({ email: acc.email, curso: acc.curso.nombre, oferta: acc.oferta, accion: registro.Estado.toLowerCase() });
      await sleep(220);
    } catch (error) {
      resumen.errores++;
      resumen.detalle.push({ email: acc.email, accion: 'error', motivo: error.message });
    }
  }
  log(`Altas manuales Kajabi: ${resumen.accesos} accesos vigentes, ${resumen.nuevos} nuevos, ${resumen.importados} importados, ${resumen.ignorados} ignorados, ${resumen.errores} errores`);
  return resumen;
}

function familiaDe(cursoKey) {
  const c = buscarCurso(cursoKey);
  return c ? c.familia : String(cursoKey || '');
}
