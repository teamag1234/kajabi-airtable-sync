/**
 * Demo del curso: el temario de prueba que se ve en la web de inicio.
 *
 * Lo usan el servidor (/api/demo-curso) y el widget de Kajabi:
 * scripts/build-demo-curso.mjs lo incrusta tal cual en kajabi/demo-curso.html.
 * Por eso no importa nada y solo usa JS de navegador.
 *
 * Cada lección tiene un `tipo` que el widget sabe pintar:
 *   intro     bloques de texto (y vídeo si `video` tiene la URL de embed)
 *   test      preguntas con corrección al momento y el truco de cada una
 *   ordenar   Reading Part 2: ordenar frases tocándolas
 *   writing   plantilla + tarea para escribir + email modelo
 *   speaking  preguntas con cuenta atrás, grabación opcional y respuesta modelo
 * `video` admite el enlace de embed de Vimeo, YouTube o Wistia. Vacío = sin vídeo.
 * Los módulos con `bloqueado: true` solo se enseñan con candado en el temario.
 */

export const DEMO_MODULOS = [
  {
    titulo: 'Empieza aquí',
    lecciones: [
      {
        id: 'aptis-por-dentro',
        tipo: 'intro',
        titulo: 'El APTIS por dentro',
        duracion: '3 min',
        video: '',
        bloques: [
          { titulo: 'Qué te vas a encontrar', texto: 'El APTIS tiene una parte común de Grammar y Vocabulary y luego las cuatro destrezas: Reading, Listening, Writing y Speaking. Todo por ordenador y en una sola sesión de unas 3 horas.' },
          { titulo: 'Cómo te puntúan', texto: 'Cada destreza va de 0 a 50 y te da un nivel del Marco Europeo (A1-C). Según lo que te pidan, cuenta tu nivel global o tu nivel en cada destreza.' },
          { titulo: 'Por qué se suspende', texto: 'Casi nunca es por falta de inglés. Es por no conocer el formato: el tiempo de cada parte, qué espera el corrector y dónde se regalan puntos. Eso es justo lo que se entrena.' },
        ],
        clave: 'En esta demo vas a probar una lección de cada parte, igual que dentro del curso. Haz los ejercicios de verdad: es la única forma de ver si el método va contigo.',
      },
    ],
  },
  {
    titulo: 'Grammar & Vocabulary',
    lecciones: [
      {
        id: 'grammar-trampas',
        tipo: 'test',
        titulo: '5 trampas de Grammar que caen siempre',
        duracion: '4 min',
        video: '',
        intro: 'Elige la respuesta y mira el truco. En el examen tienes unos 30 segundos por pregunta: aquí aprendes a verlas en 5.',
        preguntas: [
          { enunciado: 'I ___ in Madrid since 2015.', opciones: ['live', 'have lived', 'am living'], correcta: 1, truco: '"Since" o "for" con algo que sigue pasando hoy = present perfect. Si ves "since", ni lo pienses.' },
          { enunciado: 'If I ___ more time, I would study every day.', opciones: ['had', 'have', 'will have'], correcta: 0, truco: 'Ves "would" en la otra mitad → segundo condicional → pasado simple después de "if".' },
          { enunciado: 'She is used to ___ up early.', opciones: ['get', 'getting', 'got'], correcta: 1, truco: '"Be used to" va siempre con -ing. "Used to" a secas (sin be) va con infinitivo. Es de las que más caen.' },
          { enunciado: 'This is the ___ exam I have ever taken.', opciones: ['more difficult', 'most difficult', 'difficultest'], correcta: 1, truco: '"Ever" detrás de "I have" pide superlativo: the most + adjetivo largo.' },
          { enunciado: "You ___ wear a uniform. It's not compulsory.", opciones: ["mustn't", "don't have to", "can't"], correcta: 1, truco: 'No es obligatorio = "don\'t have to". Está prohibido = "mustn\'t". El examen pone las dos juntas para pillarte.' },
        ],
      },
    ],
  },
  {
    titulo: 'Reading',
    lecciones: [
      {
        id: 'reading-ordenar',
        tipo: 'ordenar',
        titulo: 'Reading Part 2: ordenar sin leerlo todo',
        duracion: '4 min',
        video: '',
        intro: 'Te dan la primera frase y tienes que ordenar el resto. Toca las frases en el orden correcto.',
        primera: 'Last summer, Laura decided to take the APTIS exam to finish her degree.',
        frases: [
          'First, she looked for information about the different parts of the test.',
          'Then she found out that she needed a B1 in all four skills.',
          'With this in mind, she made a study plan of one hour a day.',
          'After two months, she felt ready and booked her exam.',
          'Finally, she passed it and was able to graduate that same year.',
        ],
        truco: 'No hace falta entender cada palabra. Busca los conectores de tiempo (First, Then, After, Finally) y las palabras que apuntan atrás ("this", "it", "she"): "With this in mind" solo puede ir después de algo que haya que tener en cuenta.',
      },
    ],
  },
  {
    titulo: 'Writing',
    lecciones: [
      {
        id: 'writing-email-formal',
        tipo: 'writing',
        titulo: 'Writing Part 4: el email formal con plantilla',
        duracion: '6 min',
        video: '',
        intro: 'El email formal es la parte del Writing que más puntúa. Con una estructura fija dejas de pensar en cómo empezar y te centras en el contenido.',
        plantilla: [
          { frase: 'Dear Sir or Madam,', nota: 'Si no sabes el nombre. Si lo sabes: Dear Mr/Ms + apellido.' },
          { frase: 'I am writing to complain about / to ask about…', nota: 'Primera línea = motivo del email. Directo.' },
          { frase: 'Firstly, … In addition, … However, …', nota: 'Un conector al principio de cada idea. El corrector los busca.' },
          { frase: 'I would be grateful if you could…', nota: 'Pide lo que quieres de forma educada.' },
          { frase: 'I look forward to hearing from you.', nota: 'Cierre fijo. Siempre el mismo.' },
          { frase: 'Yours faithfully, / Yours sincerely,', nota: 'Faithfully con "Sir or Madam". Sincerely si has puesto el nombre.' },
        ],
        tarea: 'Your gym is going to close for three months for renovation, but you have already paid for the whole year. Write an email to the manager. Say how you feel and what you would like them to do. (120-150 words)',
        minimo: 120,
        maximo: 150,
        modelo: 'Dear Sir or Madam,\n\nI am writing to complain about the closure of the gym for three months. I have been a member for two years and I have already paid for the whole year.\n\nFirstly, I was very disappointed that members were not informed before the renewal. If I had known, I would not have paid for twelve months. In addition, there is no other gym near my house, so I will not be able to train during this time.\n\nHowever, I understand that the renovation is necessary. I would be grateful if you could refund the three months or, alternatively, extend my membership until next spring. I would also like to know if there is any other centre I could use in the meantime.\n\nI look forward to hearing from you.\n\nYours faithfully,\nLaura Gómez',
      },
    ],
  },
  {
    titulo: 'Speaking',
    lecciones: [
      {
        id: 'speaking-part-1',
        tipo: 'speaking',
        titulo: 'Speaking Part 1: 30 segundos que no se te escapan',
        duracion: '4 min',
        video: '',
        intro: 'Te hacen 3 preguntas personales y tienes 30 segundos para cada una. Responde en voz alta. Si nos das permiso para el micro, puedes grabarte y escucharte (no se guarda ni se envía nada).',
        segundos: 30,
        estructura: 'Respuesta directa + un detalle + un ejemplo o tu opinión. Con eso llenas los 30 segundos sin quedarte en blanco.',
        preguntas: [
          { pregunta: 'Please tell me about your hometown.', modelo: "I'm from Seville, in the south of Spain. It's a beautiful city with lots of history and the weather is really nice. For example, in spring the streets smell of orange blossom, and I think it's the best time to visit." },
          { pregunta: 'What do you usually do at the weekend?', modelo: 'At the weekend I usually relax and spend time with my family. On Saturdays we often go for a walk in the park. In my opinion, it\'s important to disconnect from work, so I try not to check my emails.' },
          { pregunta: 'Tell me about the last film you watched.', modelo: 'The last film I watched was a comedy on Netflix. It was about two friends who travel around Italy. I really enjoyed it because it was funny and the landscapes were amazing. I would recommend it.' },
        ],
      },
    ],
  },
  { titulo: 'Listening', bloqueado: true, lecciones: ['Las 4 partes con audios tipo examen', 'Cómo usar el tiempo antes de cada audio'] },
  { titulo: 'Writing y Speaking completos', bloqueado: true, lecciones: ['Plantillas de todas las partes', 'Speaking Part 2, 3 y 4: describir y comparar fotos'] },
  { titulo: 'Simulacros', bloqueado: true, lecciones: ['Simulacros tipo examen real con soluciones'] },
  { titulo: 'Clases en directo', bloqueado: true, lecciones: ['7 clases en directo cada semana'] },
];

/** Lecciones que se pueden hacer en la demo, en orden. */
export const DEMO_LECCIONES = DEMO_MODULOS.filter((m) => !m.bloqueado).flatMap((m) => m.lecciones);

export function leccionDemo(id) {
  return DEMO_LECCIONES.find((l) => l.id === id) || null;
}

/** Recuento de palabras para el Writing (igual en el widget y en los tests). */
export function contarPalabras(texto) {
  const t = String(texto || '').trim();
  return t ? t.split(/\s+/).length : 0;
}
