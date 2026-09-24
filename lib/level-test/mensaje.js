/**
 * Mensaje de WhatsApp para que los closers escriban a cada lead del test.
 * Se construye a partir de la fila de Airtable (etiquetas legibles), así sirve
 * tanto al guardar el test como al registrar el clic en la oferta.
 */

const NIVELES = ['A1', 'A2', 'B1', 'B2', 'C1'];

const PARA = {
  'Oposiciones docentes': 'para las oposiciones',
  'Terminar la carrera / máster': 'para terminar la carrera',
  'Policía Nacional': 'para Policía',
  Trabajo: 'para el trabajo',
};

const PLAZO = {
  'En menos de 1 mes': 'con el poco tiempo que tienes',
  'En 1-3 meses': 'con el tiempo que tienes',
  'En 3-6 meses': 'con el tiempo que tienes',
  'Aún no tengo fecha': 'y cuándo te convendría examinarte',
};

/**
 * ¿Contestó a la carrera? Seis o más respuestas seguidas con la misma letra
 * en la parte puntuable (p. ej. "AAAAAAA") no pasan en un test hecho con calma.
 */
export function respondioDeprisa(respuestas = '') {
  return /([A-J])\1{5,}/.test(respuestas);
}

/** Teléfono → número para wa.me (solo cifras, con prefijo 34 si es español sin prefijo). */
export function numeroWhatsApp(telefono = '') {
  let n = String(telefono).replace(/[^\d+]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  else if (n.startsWith('00')) n = n.slice(2);
  else if (/^[6789]\d{8}$/.test(n)) n = `34${n}`;
  return n.length >= 10 ? n : '';
}

/** Texto del mensaje: saludo, lectura del resultado y una pregunta para que conteste. */
export function mensajeCloser(fields = {}) {
  const nombre = String(fields.Nombre || '').trim().split(/\s+/)[0];
  const nombreBonito = nombre ? nombre[0].toUpperCase() + nombre.slice(1).toLowerCase() : '';
  const nivel = fields.Nivel || '';
  const necesita = NIVELES.includes(fields['Nivel que necesita']) ? fields['Nivel que necesita'] : '';
  const para = PARA[fields['Para qué']] || '';
  const plazo = PLAZO[fields['Cuándo se examina']] || 'con el tiempo que tienes';
  const deprisa = respondioDeprisa(fields.Respuestas);
  const clic = fields['Clic oferta'];

  const lineas = [`Hola${nombreBonito ? ` ${nombreBonito}` : ''}! Te escribo de AG Academy 😊 He visto que has hecho el test de nivel`];

  if (deprisa) {
    lineas.push(`Te ha salido ${nivel}, pero viendo tus respuestas creo que la segunda mitad la hiciste un poco a la carrera. ¿Puede ser? Seguramente tu nivel real es más alto`);
  } else if (necesita && NIVELES.indexOf(nivel) >= NIVELES.indexOf(necesita)) {
    const cuanto = nivel === necesita ? 'justo lo que te piden' : `más del ${necesita} que te piden`;
    lineas.push(`Te ha salido ${nivel}, ${cuanto}. Lo que te falta es conocer el examen por dentro para no dejarte puntos`);
  } else if (necesita && NIVELES.indexOf(necesita) - NIVELES.indexOf(nivel) === 1) {
    lineas.push(`Te ha salido ${nivel} y te piden ${necesita}. Estás a un paso, lo importante es ir directo a lo que puntúa en el APTIS`);
  } else if (necesita) {
    lineas.push(`Te ha salido ${nivel} y te piden ${necesita}. Hay camino por delante, así que conviene organizarlo bien desde el principio`);
  } else {
    lineas.push(`Te ha salido ${nivel}. Con eso ya se puede plantear bien el camino hasta tu certificado`);
  }

  if (clic) lineas.push(`Vi que le echaste un ojo al ${clic}`);

  const objetivo = necesita ? `Me dices que te piden ${necesita}${para ? ` ${para}` : ''}. ` : '';
  lineas.push(`${objetivo}¿Te cuento en un audio cómo lo plantearía yo ${plazo}?`);

  return lineas.join('\n\n');
}

/** Enlace que abre WhatsApp con el mensaje escrito ('' si no hay teléfono válido). */
export function enlaceWhatsApp(fields = {}) {
  const numero = numeroWhatsApp(fields['Teléfono']);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensajeCloser(fields))}` : '';
}

/** Campos a escribir en la fila: el mensaje y su enlace. */
export function camposMensaje(fields) {
  return { 'Mensaje WhatsApp': mensajeCloser(fields), 'Enviar WhatsApp': enlaceWhatsApp(fields) };
}
