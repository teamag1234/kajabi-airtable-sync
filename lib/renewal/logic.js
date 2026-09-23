import { getRecords, createRecord, updateRecord, escapeFormulaValue } from '../airtable.js';
import { sendEmail } from '../email.js';
import { buscarCurso, buscarCursoPorOferta, ofertasRenovacionDeCurso, duracionCurso, cursosDeFamilia } from './courses.js';
import { hoyMadrid, calcularFechas, diferenciaDias, sumarMeses, sumarDias, DIAS_VENTANA_RENOVACION } from './dates.js';
import { elegirPaso, estaCerrado, generarEmail } from './sequence.js';
import { urlAprobado, urlClic } from './links.js';

export const TABLA = () => process.env.AIRTABLE_RENEWALS_TABLE || 'Renovaciones';

/** Nombres de campo en la tabla Renovaciones de Airtable. */
export const F = {
  email: 'Email',
  nombre: 'Nombre',
  curso: 'Curso',
  cursoKey: 'Curso key',
  inicio: 'Fecha inicio',
  meses: 'Meses acceso',
  dias: 'Días acceso',
  fin: 'Fecha fin',
  limite: 'Fecha límite renovación',
  estado: 'Estado',
  aprobado: 'Aprobado',
  pausar: 'Pausar',
  ultimoPaso: 'Último paso enviado',
  fechaUltimoEmail: 'Fecha último email',
  emailsEnviados: 'Emails enviados',
  renovaciones: 'Nº renovaciones',
  ultimaRenovacion: 'Última renovación',
  origen: 'Origen',
  notas: 'Notas',
  renovadoDesdeEmail: 'Renovado desde email',
  pasoAlRenovar: 'Paso al renovar',
  importeRenovacion: 'Importe renovación',
  ofertaRenovacion: 'Oferta renovación',
  clics: 'Clics',
  ultimoClic: 'Último clic',
  ofertaClicada: 'Oferta clicada',
  pasoDelClic: 'Paso del clic',
};

/** Días máximos entre el clic en el email y la compra para atribuir la renovación al email. */
export const DIAS_ATRIBUCION_CLIC = 30;

export const ESTADO = {
  activo: 'Activo',
  enSecuencia: 'En secuencia',
  cerrado: 'Cerrado',
  aprobado: 'Aprobado',
  pausado: 'Pausado',
};

const OPTS = { typecast: true };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAUSA_ESCRITURA_MS = 220; // Airtable admite 5 peticiones/segundo

function normEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function filtroAlumnoCurso(email, cursoNombre) {
  const e = escapeFormulaValue(normEmail(email));
  if (!cursoNombre) return `LOWER({${F.email}}) = "${e}"`;
  return `AND(LOWER({${F.email}}) = "${e}", {${F.curso}} = "${escapeFormulaValue(cursoNombre)}")`;
}

/** Filas del alumno en cualquier curso de la familia (Directo al Aptis y variantes, etc.). */
function filtroAlumnoFamilia(email, familia) {
  const e = escapeFormulaValue(normEmail(email));
  const nombres = cursosDeFamilia(familia).map((c) => `{${F.curso}} = "${escapeFormulaValue(c.nombre)}"`);
  if (nombres.length === 0) return `LOWER({${F.email}}) = "${e}"`;
  return `AND(LOWER({${F.email}}) = "${e}", OR(${nombres.join(', ')}))`;
}

/** Fila del alumno para un curso: primero la del curso exacto, si no, la de su familia. */
async function buscarFilaAlumno(email, cursoCatalogo, cursoNombre) {
  const exacta = await getRecords(TABLA(), filtroAlumnoCurso(email, cursoNombre), { maxRecords: 1 });
  if (exacta.length > 0 || !cursoCatalogo) return exacta[0] || null;
  const familia = await getRecords(TABLA(), filtroAlumnoFamilia(email, cursoCatalogo.familia));
  return familia.sort((a, b) => String(b.fields[F.fin] || '').localeCompare(String(a.fields[F.fin] || '')))[0] || null;
}

/**
 * Da de alta (o actualiza) a un alumno en la tabla de renovaciones.
 * curso: key o nombre del catálogo, o nombre de la oferta de Kajabi.
 * Si no se reconoce el curso pero llegan `meses` o `dias`, se acepta igualmente.
 */
export async function altaRenovacion({ email, nombre, curso, fechaInicio, fechaFin, meses, dias, origen = 'manual', notas, esRenovacion = false, importe = null, oferta = null, fechaCompra = null }) {
  const e = normEmail(email);
  if (!e) throw new Error('Falta el email');
  if (!fechaInicio) throw new Error('Falta la fecha de inicio');

  const cursoCatalogo = buscarCurso(curso) || buscarCursoPorOferta(curso);
  const cursoNombre = cursoCatalogo ? cursoCatalogo.nombre : String(curso || '').trim();
  const duracion = Number(dias) ? { dias: Number(dias) } : Number(meses) ? { meses: Number(meses) } : duracionCurso(cursoCatalogo);
  if (!cursoNombre) throw new Error('Falta el curso');
  if (!fechaFin && (!duracion || (!duracion.meses && !duracion.dias))) throw new Error(`Curso no reconocido y sin duración de acceso: ${curso}`);

  // Si llega fechaFin (por ejemplo la fecha de caducidad que da Kajabi) manda
  // sobre la duración del catálogo.
  const fechas = fechaFin
    ? { fechaInicio: sumarDias(fechaInicio, 0), fechaFin: sumarDias(fechaFin, 0), fechaLimite: sumarDias(fechaFin, DIAS_VENTANA_RENOVACION) }
    : calcularFechas(fechaInicio, duracion);
  const existente = await buscarFilaAlumno(e, cursoCatalogo, cursoNombre);
  const existentes = existente ? [existente] : [];

  const campos = {
    [F.email]: e,
    [F.nombre]: nombre || (existentes[0] && existentes[0].fields[F.nombre]) || '',
    [F.curso]: cursoNombre,
    [F.cursoKey]: cursoCatalogo ? cursoCatalogo.key : '',
    [F.inicio]: fechas.fechaInicio,
    [F.meses]: (duracion && duracion.meses) || null,
    [F.dias]: (duracion && duracion.dias) || null,
    [F.fin]: fechas.fechaFin,
    [F.limite]: fechas.fechaLimite,
    [F.estado]: ESTADO.activo,
    [F.ultimoPaso]: 0,
    [F.origen]: origen,
  };
  if (notas) campos[F.notas] = notas;

  if (existentes.length > 0) {
    const actual = existentes[0];
    const finActual = actual.fields[F.fin];
    const inicioActual = actual.fields[F.inicio];
    const mismoFin = finActual && diferenciaDias(finActual, fechas.fechaFin) === 0;
    const mismoInicio = inicioActual && diferenciaDias(inicioActual, fechas.fechaInicio) === 0;
    if (mismoFin && mismoInicio) {
      return { accion: 'sin-cambios', id: actual.id, fechas };
    }
    // Una renovación amplía la fila que ya tiene el alumno: conserva su curso
    // (la oferta "Renovación Directo al Aptis" no distingue Express de Tutorizado)
    // y registra la renovación y su atribución.
    let renovadoDesdeEmail = false;
    if (esRenovacion) {
      campos[F.curso] = actual.fields[F.curso];
      campos[F.cursoKey] = actual.fields[F.cursoKey] || campos[F.cursoKey];
      campos[F.renovaciones] = Number(actual.fields[F.renovaciones] || 0) + 1;
      campos[F.ultimaRenovacion] = fechaCompra || fechas.fechaInicio;
      if (oferta) campos[F.ofertaRenovacion] = oferta;
      if (importe != null) campos[F.importeRenovacion] = Number(importe);
      const pasoPrevio = Number(actual.fields[F.ultimoPaso] || 0);
      if (pasoPrevio > 0) campos[F.pasoAlRenovar] = pasoPrevio;
      const ultimoClic = actual.fields[F.ultimoClic];
      const compra = fechaCompra || fechas.fechaInicio;
      if (ultimoClic && diferenciaDias(ultimoClic, compra) >= 0 && diferenciaDias(ultimoClic, compra) <= DIAS_ATRIBUCION_CLIC) {
        renovadoDesdeEmail = true;
        campos[F.renovadoDesdeEmail] = true;
      }
    }
    // No pisar el estado de un alumno aprobado o pausado; solo cambian las fechas
    if (actual.fields[F.aprobado] || actual.fields[F.pausar]) {
      delete campos[F.estado];
      delete campos[F.ultimoPaso];
    }
    const rec = await updateRecord(TABLA(), actual.id, campos, OPTS);
    return { accion: 'actualizado', id: rec.id, fechas, renovadoDesdeEmail };
  }

  const rec = await createRecord(TABLA(), campos, OPTS);
  return { accion: 'creado', id: rec.id, fechas };
}

/**
 * Aplica una renovación: amplía el acceso `meses` a partir de la fecha de fin
 * (o de la fecha del pago si ya había pasado) y reinicia la secuencia.
 * Si se indica curso se aplica a esa fila; si no, a la más reciente del alumno.
 */
export async function aplicarRenovacion({ email, meses, fecha, curso }) {
  const e = normEmail(email);
  const m = Number(meses);
  if (!e) throw new Error('Falta el email');
  if (!m) throw new Error('Faltan los meses de la renovación');
  const fechaPago = fecha || hoyMadrid();

  const cursoCatalogo = curso ? buscarCurso(curso) || buscarCursoPorOferta(curso) : null;
  const filas = await getRecords(TABLA(), filtroAlumnoCurso(e, cursoCatalogo ? cursoCatalogo.nombre : curso));
  if (filas.length === 0) return { accion: 'no-encontrado', email: e };

  const fila = filas
    .filter((r) => !r.fields[F.aprobado])
    .sort((a, b) => String(b.fields[F.fin] || '').localeCompare(String(a.fields[F.fin] || '')))[0] || filas[0];

  const finActual = fila.fields[F.fin] || fechaPago;
  const nuevoInicio = diferenciaDias(finActual, fechaPago) > 0 ? fechaPago : finActual;
  const nuevoFin = sumarMeses(nuevoInicio, m);

  const campos = {
    [F.inicio]: nuevoInicio,
    [F.meses]: m,
    [F.dias]: null,
    [F.fin]: nuevoFin,
    [F.limite]: sumarDias(nuevoFin, DIAS_VENTANA_RENOVACION),
    [F.estado]: ESTADO.activo,
    [F.ultimoPaso]: 0,
    [F.pausar]: false,
    [F.renovaciones]: Number(fila.fields[F.renovaciones] || 0) + 1,
    [F.ultimaRenovacion]: fechaPago,
  };
  await updateRecord(TABLA(), fila.id, campos, OPTS);
  return { accion: 'renovado', id: fila.id, fechaInicio: nuevoInicio, fechaFin: nuevoFin, fechaLimite: campos[F.limite] };
}

/** Marca aprobado o pausado (o los quita) en las filas del alumno. */
export async function actualizarEstadoAlumno({ email, curso, aprobado, pausar }) {
  const e = normEmail(email);
  if (!e) throw new Error('Falta el email');
  const cursoCatalogo = curso ? buscarCurso(curso) || buscarCursoPorOferta(curso) : null;
  const filas = await getRecords(TABLA(), filtroAlumnoCurso(e, cursoCatalogo ? cursoCatalogo.nombre : curso));
  if (filas.length === 0) return { accion: 'no-encontrado', email: e };

  const campos = {};
  if (typeof aprobado === 'boolean') campos[F.aprobado] = aprobado;
  if (typeof pausar === 'boolean') campos[F.pausar] = pausar;
  if (aprobado === true) campos[F.estado] = ESTADO.aprobado;
  else if (pausar === true) campos[F.estado] = ESTADO.pausado;
  else if (aprobado === false || pausar === false) campos[F.estado] = ESTADO.activo;

  let actualizadas = 0;
  for (const fila of filas) {
    await updateRecord(TABLA(), fila.id, campos, OPTS);
    actualizadas++;
    await sleep(PAUSA_ESCRITURA_MS);
  }
  return { accion: 'actualizado', filas: actualizadas };
}

/** Registra un clic en una oferta de renovación desde el email. */
export async function registrarClic({ email, cursoKey, ofertaKey, paso, hoy = hoyMadrid() }) {
  const cursoCatalogo = buscarCurso(cursoKey);
  const fila = await buscarFilaAlumno(email, cursoCatalogo, cursoCatalogo ? cursoCatalogo.nombre : cursoKey);
  if (!fila) return { accion: 'no-encontrado' };
  await updateRecord(TABLA(), fila.id, {
    [F.clics]: Number(fila.fields[F.clics] || 0) + 1,
    [F.ultimoClic]: hoy,
    [F.ofertaClicada]: ofertaKey || '',
    [F.pasoDelClic]: Number(paso) || Number(fila.fields[F.ultimoPaso] || 0),
  }, OPTS);
  return { accion: 'registrado', id: fila.id };
}

function filtroPendientes() {
  return `AND(NOT({${F.aprobado}}), NOT({${F.pausar}}), {${F.estado}} != "${ESTADO.cerrado}")`;
}

/**
 * Proceso diario. Para cada alumno sin aprobar, sin pausar y sin cerrar:
 *  - completa fechas si faltan (filas metidas a mano en Airtable),
 *  - cierra la fila si ya pasó la fecha límite,
 *  - envía el email del paso que toque (uno como máximo).
 * dryRun = true calcula todo sin enviar ni escribir.
 */
export async function procesarSecuencia({ dryRun = false, hoy = hoyMadrid(), testTo = process.env.RENEWAL_TEST_TO, max = null } = {}) {
  const filas = await getRecords(TABLA(), filtroPendientes());
  // Modo prueba: con RENEWAL_TEST_TO todos los emails van a esa dirección y no
  // se anota nada en Airtable, así que al quitar la variable salen de verdad.
  const modoPrueba = Boolean(testTo && String(testTo).trim());
  const resumen = { hoy, dryRun, modoPrueba, testTo: modoPrueba ? String(testTo).trim() : null, revisados: filas.length, enviados: 0, cerrados: 0, completados: 0, errores: 0, detalle: [] };

  for (const fila of filas) {
    const f = fila.fields;
    const email = normEmail(f[F.email]);
    try {
      let fechaFin = f[F.fin];
      let fechaLimite = f[F.limite];

      if (!fechaFin) {
        const cursoCatalogo = buscarCurso(f[F.cursoKey]) || buscarCurso(f[F.curso]) || buscarCursoPorOferta(f[F.curso]);
        const duracion = Number(f[F.dias]) ? { dias: Number(f[F.dias]) } : Number(f[F.meses]) ? { meses: Number(f[F.meses]) } : duracionCurso(cursoCatalogo);
        if (!f[F.inicio] || !duracion) {
          resumen.detalle.push({ email, curso: f[F.curso], accion: 'omitido', motivo: 'faltan fecha de inicio o duración' });
          continue;
        }
        const fechas = calcularFechas(f[F.inicio], duracion);
        fechaFin = fechas.fechaFin;
        fechaLimite = fechas.fechaLimite;
        if (!dryRun) {
          await updateRecord(TABLA(), fila.id, {
            [F.fin]: fechaFin,
            [F.limite]: fechaLimite,
            [F.meses]: duracion.meses || null,
            [F.dias]: duracion.dias || null,
            [F.cursoKey]: cursoCatalogo ? cursoCatalogo.key : f[F.cursoKey] || '',
            [F.estado]: f[F.estado] || ESTADO.activo,
          }, OPTS);
          await sleep(PAUSA_ESCRITURA_MS);
        }
        resumen.completados++;
      }
      if (!fechaLimite) fechaLimite = sumarDias(fechaFin, DIAS_VENTANA_RENOVACION);

      const diasDesdeFin = diferenciaDias(fechaFin, hoy);

      if (estaCerrado(diasDesdeFin)) {
        if (!dryRun && !modoPrueba) {
          await updateRecord(TABLA(), fila.id, { [F.estado]: ESTADO.cerrado }, OPTS);
          await sleep(PAUSA_ESCRITURA_MS);
        }
        resumen.cerrados++;
        resumen.detalle.push({ email, curso: f[F.curso], accion: 'cerrado', fechaFin, fechaLimite });
        continue;
      }

      const paso = elegirPaso(diasDesdeFin, Number(f[F.ultimoPaso] || 0));
      if (!paso) continue;
      if (max && resumen.enviados >= max) continue; // límite de envíos (útil en pruebas)

      const cursoDeLaFila = buscarCurso(f[F.cursoKey]) || buscarCurso(f[F.curso]) || buscarCursoPorOferta(f[F.curso]);
      const ctx = {
        nombre: f[F.nombre],
        curso: f[F.curso],
        fechaFin,
        fechaLimite,
        diasHastaFin: -diasDesdeFin,
        diasHastaLimite: diferenciaDias(hoy, fechaLimite),
        ofertas: ofertasRenovacionDeCurso(cursoDeLaFila).map((o) => ({
          ...o,
          url: urlClic({ email, cursoKey: f[F.cursoKey] || (cursoDeLaFila && cursoDeLaFila.key) || '', ofertaKey: o.key, paso: paso.paso }),
        })),
        urlAprobado: urlAprobado({ email, cursoKey: f[F.cursoKey] || (cursoDeLaFila && cursoDeLaFila.key) || '' }),
      };
      const mail = generarEmail(paso.paso, ctx);

      if (!dryRun && modoPrueba) {
        await sendEmail({ to: resumen.testTo, subject: `[PRUEBA → ${email}] ${mail.asunto}`, html: mail.html, text: mail.texto });
      } else if (!dryRun) {
        await sendEmail({ to: email, subject: mail.asunto, html: mail.html, text: mail.texto });
        await updateRecord(TABLA(), fila.id, {
          [F.ultimoPaso]: paso.paso,
          [F.fechaUltimoEmail]: hoy,
          [F.emailsEnviados]: Number(f[F.emailsEnviados] || 0) + 1,
          [F.estado]: ESTADO.enSecuencia,
        }, OPTS);
        await sleep(PAUSA_ESCRITURA_MS);
      }
      resumen.enviados++;
      resumen.detalle.push({ email, curso: f[F.curso], accion: dryRun ? 'enviaría' : modoPrueba ? 'enviado a prueba' : 'enviado', paso: paso.paso, asunto: mail.asunto, fechaFin, fechaLimite });
    } catch (error) {
      console.error(`Error procesando renovación de ${email}:`, error.message);
      resumen.errores++;
      resumen.detalle.push({ email, curso: f[F.curso], accion: 'error', motivo: error.message });
    }
  }

  console.log(`Renovaciones: ${resumen.revisados} revisados, ${resumen.enviados} emails, ${resumen.cerrados} cerrados, ${resumen.errores} errores`);
  return resumen;
}

/** Recuento por estado para el dashboard. */
export async function resumenRenovaciones() {
  const filas = await getRecords(TABLA(), null, { fields: [F.estado, F.aprobado, F.pausar, F.fin, F.renovaciones, F.renovadoDesdeEmail, F.importeRenovacion, F.clics] });
  const hoy = hoyMadrid();
  const conteo = { total: filas.length, activos: 0, enSecuencia: 0, cerrados: 0, aprobados: 0, pausados: 0, ventanaAbierta: 0, renovados: 0, renovadosDesdeEmail: 0, ingresosDesdeEmail: 0, conClic: 0 };
  for (const r of filas) {
    const f = r.fields;
    const estado = f[F.estado] || ESTADO.activo;
    if (Number(f[F.renovaciones] || 0) > 0) conteo.renovados++;
    if (f[F.renovadoDesdeEmail]) { conteo.renovadosDesdeEmail++; conteo.ingresosDesdeEmail += Number(f[F.importeRenovacion] || 0); }
    if (Number(f[F.clics] || 0) > 0) conteo.conClic++;
    if (f[F.aprobado]) conteo.aprobados++;
    else if (f[F.pausar]) conteo.pausados++;
    else if (estado === ESTADO.cerrado) conteo.cerrados++;
    else if (estado === ESTADO.enSecuencia) conteo.enSecuencia++;
    else conteo.activos++;

    if (!f[F.aprobado] && !f[F.pausar] && estado !== ESTADO.cerrado && f[F.fin]) {
      const d = diferenciaDias(f[F.fin], hoy);
      if (d >= -7 && d <= 7) conteo.ventanaAbierta++;
    }
  }
  return { hoy, ...conteo };
}
