/**
 * Test de nivel APTIS: preguntas, corrección, nivel y curso recomendado.
 *
 * Este archivo lo usan tanto el servidor (/api/test-nivel) como el widget de
 * Kajabi: scripts/build-test-nivel.mjs lo incrusta tal cual en
 * kajabi/test-nivel.html. Por eso no importa nada y solo usa JS de navegador.
 *
 * Las preguntas son las 34 puntuables del assessment de Kajabi (/test-nivel).
 * `correcta` es el índice de la opción buena. El 100% equivale a B2.
 */

export const SECCIONES = {
  writing: { titulo: 'Writing', intro: 'Mensajes cortos, un texto breve y emails formales e informales. Igual que en el examen.' },
  reading: { titulo: 'Reading', intro: 'Un email con 5 huecos. Elige la palabra que encaja en cada uno.' },
  grammar: { titulo: 'Grammar', intro: '10 frases. Elige la opción correcta.' },
  vocab: { titulo: 'Vocabulary', intro: 'Definiciones y palabras que suelen ir juntas. Aquí se ve el nivel de verdad.' },
};

const MUSIC = 'Te has unido a un club de música. Otro miembro te escribe. Responde en 1-5 palabras.';
const EMAILS = 'En el Aptis escribirás un email informal y otro formal. ¿Sabes cómo se hacen?';
const CARTA = 'Dear Susan,\nThank you for offering to find information about Technology courses in London.\nI want to come from the {1} of July. I {2} love to share a flat with other students. And remember I only want to attend classes {3} the evening, ok?\nAnd if possible, could we go on a {4} together for a weekend to know the place?\nI {5} from you.\nBest wishes,\nSteven.';
const GRAMMAR = 'Elige la opción correcta.';
const DEFINICIONES = ['Make out', 'Take after', 'Aid', 'Purchase', 'Control', 'Sprint', 'Empty', 'Lay', 'Remove', 'Calculate'];
const COLOCACIONES = ['Bomb', 'Audition', 'Scissors', 'Rod', 'Classes', 'Strings', 'Salesman', 'Seep', 'Minister', 'Seat'];

export const PREGUNTAS = [
  { seccion: 'writing', contexto: MUSIC, enunciado: 'What do you do?', opciones: ["I'm listening to music.", 'I am an engineer.', 'I work right now.'], correcta: 1 },
  { seccion: 'writing', contexto: MUSIC, enunciado: 'Can you play any musical instruments?', opciones: ["No, I'm not.", 'I know play the guitar.', 'Yes, I play the piano.'], correcta: 2 },
  { seccion: 'writing', contexto: MUSIC, enunciado: "What's your favourite music band?", opciones: ['My favourite band is Coldplay.', 'I love a Rolling Stones.', 'I play with my friends in a band.'], correcta: 0 },
  { seccion: 'writing', contexto: MUSIC, enunciado: 'What are you doing this weekend?', opciones: ['I play with my band', "I'm meeting my cousins", 'I go for lunch'], correcta: 1 },
  {
    seccion: 'writing', contexto: 'Completa tu ficha del club con frases completas (20-30 palabras).',
    enunciado: 'Please, tell us who you currently enjoy your free time with and what type of music you like.',
    opciones: [
      'I like to stay with my friends in my free time because we really love staying together.',
      'Nowadays I love to spend time with my friend Joe. We always listen to our favourite kind of music, hip hop.',
      'I used to like pop music and spend time together. We are so happy when we do these things.',
    ],
    correcta: 1,
  },
  { seccion: 'writing', contexto: EMAILS, enunciado: 'How would you start a formal email for the secretary of the club?', opciones: ['Dear Madam,', 'Hello Mrs Secretary,', 'Dear Sir or Madam,'], correcta: 2 },
  { seccion: 'writing', contexto: EMAILS, enunciado: "What's the best way to finish an informal email?", opciones: ['Yours sincerely.', 'Yours faithfully.', 'Take care.'], correcta: 2 },
  { seccion: 'writing', contexto: EMAILS, enunciado: 'Which sentence belongs to a formal email?', opciones: ['How are things? I hope everything is ok.', 'Let me know if you need further information.', 'Send me the information soon, please.'], correcta: 1 },
  {
    seccion: 'writing', contexto: EMAILS, enunciado: 'Choose the correct statement:',
    opciones: ['Phrasal verbs cannot be used in informal emails.', 'You can use contractions in formal emails, but not phrasal verbs.', 'You can use phrasal verbs and contractions in informal emails.'],
    correcta: 2,
  },
  { seccion: 'reading', texto: CARTA, hueco: 1, enunciado: 'Hueco 1', opciones: ['end', 'ending', 'begin'], correcta: 0 },
  { seccion: 'reading', texto: CARTA, hueco: 2, enunciado: 'Hueco 2', opciones: ['–', 'would', 'could'], correcta: 1 },
  { seccion: 'reading', texto: CARTA, hueco: 3, enunciado: 'Hueco 3', opciones: ['for', 'in', 'at'], correcta: 1 },
  { seccion: 'reading', texto: CARTA, hueco: 4, enunciado: 'Hueco 4', opciones: ['hotel', 'trip', 'travel'], correcta: 1 },
  { seccion: 'reading', texto: CARTA, hueco: 5, enunciado: 'Hueco 5', opciones: ['am looking forward to hearing', 'look forward to hear', 'would like to hearing'], correcta: 0 },
  { seccion: 'grammar', contexto: GRAMMAR, enunciado: 'If you were a better cook, you _____ need to eat out all the time.', opciones: ["hadn't", "wouldn't", "won't"], correcta: 1 },
  { seccion: 'grammar', contexto: GRAMMAR, enunciado: 'She reads every day _____ she isn’t serious.', opciones: ['but', 'because', 'and'], correcta: 0 },
  { seccion: 'grammar', contexto: GRAMMAR, enunciado: 'The children _____ playing football for two hours before it started raining.', opciones: ['have been', 'had been', 'has been'], correcta: 1 },
  { seccion: 'grammar', contexto: GRAMMAR, enunciado: "I don't think it's right _____ children to play with toy guns.", opciones: ['for', 'that', 'to'], correcta: 0 },
  { seccion: 'grammar', contexto: GRAMMAR, enunciado: 'I _____ to work when I saw Steve.', opciones: ['went', 'going', 'was going'], correcta: 2 },
  { seccion: 'grammar', contexto: "That man's so unreliable – you can't trust him.", enunciado: '¿Qué respuesta suena natural?', opciones: ['I wouldn’t work frankly with him.', 'Frankly, I wouldn’t work with him.', 'I wouldn’t frankly work with him.'], correcta: 1 },
  { seccion: 'grammar', contexto: GRAMMAR, enunciado: 'We could cook dinner. _____, we could buy some take away food.', opciones: ['Although', 'Therefore', 'On the other hand'], correcta: 2 },
  { seccion: 'grammar', contexto: GRAMMAR, enunciado: 'In those days, my father _____ never eat dinner after eight o’clock.', opciones: ['will', 'used to', 'would'], correcta: 2 },
  { seccion: 'grammar', contexto: GRAMMAR, enunciado: 'There were _____ than fifty people in the audience last night.', opciones: ['lesser', 'fewer', 'few'], correcta: 1 },
  { seccion: 'grammar', contexto: GRAMMAR, enunciado: 'We _____ have caught the early train, as the football match was delayed.', opciones: ["didn't", "mustn't", "needn't"], correcta: 2 },
  { seccion: 'vocab', contexto: 'Elige la palabra que corresponde a la definición.', enunciado: 'To run quickly is to…', opciones: DEFINICIONES, correcta: 5 },
  { seccion: 'vocab', contexto: 'Elige la palabra que corresponde a la definición.', enunciado: 'To look like an older member of your family is to…', opciones: DEFINICIONES, correcta: 1 },
  { seccion: 'vocab', contexto: 'Elige la palabra que corresponde a la definición.', enunciado: 'To help is to…', opciones: DEFINICIONES, correcta: 2 },
  { seccion: 'vocab', contexto: 'Elige la palabra que corresponde a la definición.', enunciado: 'To remove or consume the contents is to…', opciones: DEFINICIONES, correcta: 6 },
  { seccion: 'vocab', contexto: 'Elige la palabra que corresponde a la definición.', enunciado: 'To determine by mathematical methods is to…', opciones: DEFINICIONES, correcta: 9 },
  { seccion: 'vocab', contexto: '¿Qué palabra se usa más con esta?', enunciado: 'Aerobics', opciones: COLOCACIONES, correcta: 4 },
  { seccion: 'vocab', contexto: '¿Qué palabra se usa más con esta?', enunciado: 'Agriculture', opciones: COLOCACIONES, correcta: 8 },
  { seccion: 'vocab', contexto: '¿Qué palabra se usa más con esta?', enunciado: 'Aisle', opciones: COLOCACIONES, correcta: 9 },
  { seccion: 'vocab', contexto: '¿Qué palabra se usa más con esta?', enunciado: 'Apron', opciones: COLOCACIONES, correcta: 5 },
  { seccion: 'vocab', contexto: '¿Qué palabra se usa más con esta?', enunciado: 'Atom', opciones: COLOCACIONES, correcta: 0 },
];

/** Preguntas de perfil (no puntúan). Deciden el curso recomendado. */
export const PERFIL = {
  para: {
    pregunta: '¿Para qué necesitas el APTIS?',
    opciones: [
      { valor: 'oposiciones', texto: 'Oposiciones docentes' },
      { valor: 'universidad', texto: 'Terminar la carrera / máster' },
      { valor: 'policia', texto: 'Policía Nacional' },
      { valor: 'trabajo', texto: 'Trabajo' },
      { valor: 'otro', texto: 'Otro motivo' },
    ],
  },
  necesita: {
    pregunta: '¿Qué nivel te piden?',
    opciones: [
      { valor: 'A2', texto: 'A2' },
      { valor: 'B1', texto: 'B1' },
      { valor: 'B2', texto: 'B2' },
      { valor: 'C1', texto: 'C1' },
      { valor: 'no-se', texto: 'Aún no lo sé' },
    ],
  },
  cuando: {
    pregunta: '¿Cuándo quieres examinarte?',
    opciones: [
      { valor: 'menos-1-mes', texto: 'En menos de 1 mes' },
      { valor: '1-3-meses', texto: 'En 1-3 meses' },
      { valor: '3-6-meses', texto: 'En 3-6 meses' },
      { valor: 'sin-fecha', texto: 'Aún no tengo fecha' },
    ],
  },
};

export const NIVELES = ['A1', 'A2', 'B1', 'B2', 'C1'];

/**
 * Porcentaje de aciertos → nivel. El 100% es B2 (el test no llega a medir C1).
 * El umbral es el mínimo de aciertos (%) para tener ese nivel.
 */
export const UMBRALES = [
  { nivel: 'B2', desde: 85 },
  { nivel: 'B1', desde: 55 },
  { nivel: 'A2', desde: 30 },
  { nivel: 'A1', desde: 0 },
];

export function nivelDesdePorcentaje(porcentaje) {
  return UMBRALES.find((u) => porcentaje >= u.desde).nivel;
}

/**
 * Corrige las respuestas (array de índices, una por pregunta, null si falta).
 * Devuelve aciertos, nota sobre 10, porcentaje, nivel y aciertos por sección.
 */
export function corregir(respuestas = []) {
  const porSeccion = {};
  let aciertos = 0;
  PREGUNTAS.forEach((p, i) => {
    const s = (porSeccion[p.seccion] ||= { aciertos: 0, total: 0 });
    s.total += 1;
    if (respuestas[i] === p.correcta) {
      s.aciertos += 1;
      aciertos += 1;
    }
  });
  const total = PREGUNTAS.length;
  const porcentaje = Math.round((aciertos / total) * 100);
  return {
    aciertos,
    total,
    porcentaje,
    nota: Math.round((aciertos / total) * 100) / 10,
    nivel: nivelDesdePorcentaje(porcentaje),
    porSeccion,
  };
}

/**
 * Cursos de la store. `url` es el checkout de Kajabi. El descuento del test se
 * resta del precio y se aplica con el cupón en la URL.
 */
export const CURSOS_TEST = {
  level: {
    nombre: 'APTIS Level',
    subtitulo: '3 meses · A2 y B1',
    precio: 647,
    url: 'https://www.agacademyaptis.com/offers/aLwrqozM/checkout',
    incluye: ['3 meses de acceso completo', 'Material por niveles (A1-A2-B1)', '7 clases en directo cada semana', 'Guías paso a paso de cada parte del examen', 'Simulacros con soluciones'],
  },
  express: {
    nombre: 'Directo a tu Certificado Express',
    subtitulo: '6 meses · del A1 al C2 · garantía de aprobado',
    precio: 947,
    url: 'https://www.agacademyaptis.com/offers/TRchWq3V/checkout',
    incluye: ['6 meses de acceso (A1 a C2)', '+500 lecciones con trucos y atajos', '7 clases en directo cada semana', '+10 simulacros tipo examen real', 'Garantía: si no apruebas, te pagamos los exámenes'],
  },
  tutorizado: {
    nombre: 'Directo a tu Certificado Tutorizado',
    subtitulo: '6 meses · tutor personal · garantía de aprobado',
    precio: 1247,
    url: 'https://www.agacademyaptis.com/offers/422hix8o/checkout',
    incluye: ['Todo lo del Express', '10 sesiones 1 a 1 de Speaking y Writing', 'WhatsApp directo con tus tutores', 'Seguimiento personalizado', 'Garantía: te pagamos todos los exámenes hasta aprobar'],
  },
};

const OBJETIVO = { A2: 1, B1: 2, B2: 3, C1: 4, 'no-se': 2 };

/**
 * Elige el curso según el nivel actual, el que le piden y el tiempo que tiene.
 * Level solo llega a B1; para B2/C1 siempre es Directo. Cuanto más salto de
 * nivel y menos tiempo, más acompañamiento (Tutorizado).
 */
export function recomendarCurso({ necesita, cuando } = {}, nivel) {
  const actual = NIVELES.indexOf(nivel);
  const objetivo = OBJETIVO[necesita] ?? 2;
  const nivelObjetivo = NIVELES[objetivo];
  const salto = objetivo - actual;
  const prisa = cuando === 'menos-1-mes';
  const pocoTiempo = prisa || cuando === '1-3-meses';
  const plazo = prisa ? 'en menos de un mes' : pocoTiempo ? 'en pocos meses' : 'a tu ritmo';

  let curso;
  let motivo;
  if (salto <= 0) {
    curso = objetivo >= 3 ? 'express' : 'level';
    motivo = `Ya tienes el ${nivelObjetivo}. Lo que te falta es conocer el examen por dentro y no dejar puntos por el camino.`;
  } else if (objetivo >= 3) {
    curso = salto >= 2 || prisa ? 'tutorizado' : 'express';
    motivo = curso === 'tutorizado'
      ? `Pasar de ${nivel} a ${nivelObjetivo} ${plazo} se hace mucho más fácil con alguien que te corrija y te diga qué te falta.`
      : `Para el ${nivelObjetivo} necesitas el método completo, del nivel que tienes hasta el que te piden.`;
  } else if (salto === 1) {
    curso = prisa ? 'express' : 'level';
    motivo = prisa
      ? `Te separa un nivel del ${nivelObjetivo} y vas con el tiempo justo: necesitas ir directo a lo que puntúa.`
      : `Te separa un solo nivel del ${nivelObjetivo}. Con 3 meses de método bien organizado llegas.`;
  } else {
    curso = pocoTiempo ? 'tutorizado' : 'express';
    motivo = pocoTiempo
      ? `De ${nivel} a ${nivelObjetivo} ${plazo} se puede, pero no solo. Con tutor sabes cada semana dónde estás.`
      : `De ${nivel} a ${nivelObjetivo} hay camino, y con 6 meses y el método completo lo recorres sin agobios.`;
  }
  return { curso, motivo, nivelObjetivo, salto };
}
