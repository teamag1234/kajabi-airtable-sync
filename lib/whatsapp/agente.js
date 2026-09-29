import Anthropic from '@anthropic-ai/sdk';
import { CURSOS_TEST } from '../level-test/quiz.js';

/**
 * Agente de WhatsApp para quien viene del test de nivel. Una llamada a Claude por
 * turno: recibe el historial y los datos del test y devuelve los mensajes a
 * enviar y si hay que pasar la conversación a un closer.
 */

export const MODELO = () => process.env.AGENTE_MODELO || 'claude-opus-5-5';
const EFFORT = () => process.env.AGENTE_EFFORT || 'low';
const CUPON = () => process.env.AGENTE_CUPON || 'TEST300';
export const MAX_MENSAJES_AGENTE = 40;

function enlace(key) {
  const u = new URL(CURSOS_TEST[key].url);
  u.searchParams.set('coupon_code', CUPON());
  u.searchParams.set('utm_source', 'whatsapp-agente');
  u.searchParams.set('utm_medium', 'whatsapp');
  u.searchParams.set('utm_campaign', 'test-nivel');
  u.searchParams.set('utm_content', key);
  return u.toString();
}

const cursosTexto = () => Object.entries(CURSOS_TEST).map(([key, c]) =>
  `- ${c.nombre} (${c.subtitulo}). Precio ${c.precio} €, con el descuento del test ${c.precio - 300} €. Incluye: ${c.incluye.join('; ')}. Enlace de compra con el descuento ya aplicado: ${enlace(key)}`,
).join('\n');

/** Parte fija de las instrucciones (se cachea entre llamadas). */
export function instrucciones() {
  return `Eres el asistente de WhatsApp de AG Academy (Always Growing Academy), academia online española que prepara el examen APTIS. Hablas con personas que acaban de hacer nuestro test de nivel y nos han escrito pidiendo su plan personalizado.

Quiénes somos: "la autoescuela del APTIS". No somos una academia de inglés; somos un método directo para aprobar el examen. Unos 6.000 alumnos y un 94% de aprobados. Muchos alumnos son opositores docentes, universitarios que necesitan el certificado para titularse, candidatos a Policía Nacional (A2) y profesionales.

Tu objetivo: darle un plan personalizado útil a partir de su resultado y, si le encaja, que empiece el curso que mejor le va. Primero ayudas, después recomiendas.

Cómo escribes:
- Español de España, cercano y natural, como un mensaje de WhatsApp de una persona del equipo. Frases cortas.
- Cada mensaje de 1 a 3 frases. Nada de listas, viñetas, negritas ni títulos.
- Sin lenguaje de vendedor ni urgencias inventadas. Tono de exclusividad y de alguien que sabe de lo que habla.
- Máximo 2-3 mensajes por turno. Termina con una pregunta cuando tenga sentido, para que la conversación siga.
- Usa su nombre de pila de vez en cuando, no en cada mensaje.

Eres un asistente automático, no una persona. En tu primer mensaje de la conversación preséntate como "el asistente de AG Academy". Si te preguntan si eres una persona o un bot, dilo con naturalidad y ofrece pasarle con alguien del equipo. Nunca digas que eres Jesu ni ninguna otra persona concreta.

El plan personalizado (primera respuesta): explica en pocas frases qué significa su nivel frente al que le piden, qué parte del examen trabajaría primero (la que peor le ha salido) y cómo organizaría el tiempo hasta el examen. Luego pregúntale algo para conocer su situación (fecha concreta, horas a la semana, si ya se ha presentado antes…). No sueltes el curso en el primer mensaje salvo que lo pida.

Cursos (solo estos, con estos precios):
${cursosTexto()}
Todos tienen 15 días de prueba: si no le convence, le devolvemos el dinero. Se pueden pagar en 3 cuotas sin intereses con Klarna. El descuento de 300 € es por haber hecho el test y ya va aplicado en el enlace; no inventes otros descuentos ni cupones.

Cuando recomiendes un curso, explica en una frase por qué le encaja a él y pásale su enlace tal cual (el enlace completo, sin acortarlo ni cambiarlo). Si duda, recuérdale la prueba de 15 días. Si dice que no, respétalo sin insistir.

Lo que no sabes, no lo inventes: fechas y sedes de examen, precios del examen oficial, temas de facturación, accesos a la plataforma, estado de pagos o cualquier dato que no esté aquí. En esos casos, o si se queja, está enfadado, pide hablar con una persona, tiene un problema con un pago o ves que la conversación se atasca, pon pasar_a_closer a true y en el mensaje dile que un compañero del equipo le escribe por aquí en cuanto pueda.

Si te manda un audio, una imagen o algo sin texto, dile con naturalidad que ahora mismo no puedes escuchar audios ni ver imágenes y pídele que te lo escriba.

Formato de salida: "mensajes" son los textos que se enviarán tal cual por WhatsApp, en orden. "pasar_a_closer" es true solo cuando haya que pasar la conversación a una persona. "motivo" explica en pocas palabras por qué (vacío si no hace falta).`;
}

/** Datos del test del lead, para las instrucciones de esta conversación. */
export function contextoLead(f = {}) {
  const linea = (k, v) => (v ? `- ${k}: ${v}` : null);
  return ['Datos de esta persona (de su test de nivel):',
    linea('Nombre', f.Nombre),
    linea('Nivel que le ha salido', f.Nivel && `${f.Nivel} (nota ${String(f.Nota ?? '').replace('.', ',')}/10, ${f.Aciertos ?? '?'} de 34 aciertos)`),
    linea('Por partes', ['Writing', 'Reading', 'Grammar', 'Vocabulary'].map((s) => f[s] && `${s} ${f[s]}`).filter(Boolean).join(', ')),
    linea('Nivel que le piden', f['Nivel que necesita']),
    linea('Para qué lo necesita', f['Para qué']),
    linea('Cuándo se examina', f['Cuándo se examina']),
    linea('Curso que le recomendó el test', f['Curso recomendado']),
    linea('Curso en el que hizo clic', f['Clic oferta']),
  ].filter(Boolean).join('\n');
}

/**
 * Historial (filas de Airtable) → mensajes para Claude. Los mensajes de los
 * closers van como turnos del asistente marcados, para que el agente sepa qué
 * se le ha dicho.
 */
export function mensajesParaClaude(historial) {
  const out = [];
  for (const m of historial) {
    const role = m.rol === 'Alumno' ? 'user' : 'assistant';
    const texto = m.rol === 'Closer' ? `[Mensaje de un compañero del equipo] ${m.texto}` : m.texto;
    if (!texto) continue;
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.role === role) ultimo.content += `\n\n${texto}`;
    else out.push({ role, content: texto });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

const ESQUEMA = {
  type: 'object',
  properties: {
    mensajes: { type: 'array', items: { type: 'string' } },
    pasar_a_closer: { type: 'boolean' },
    motivo: { type: 'string' },
  },
  required: ['mensajes', 'pasar_a_closer', 'motivo'],
  additionalProperties: false,
};

let cliente = null;

/**
 * Pide a Claude la respuesta. Devuelve { mensajes, pasarACloser, motivo }.
 * Ante una negativa o una respuesta ilegible, pasa la conversación a un closer
 * sin escribir nada al alumno.
 */
export async function responder({ lead, historial }) {
  cliente ||= new Anthropic();
  const messages = mensajesParaClaude(historial);
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return { mensajes: [], pasarACloser: false, motivo: '' };
  }

  const response = await cliente.beta.messages.create({
    model: MODELO(),
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: EFFORT(), format: { type: 'json_schema', schema: ESQUEMA } },
    system: [
      { type: 'text', text: instrucciones(), cache_control: { type: 'ephemeral' } },
      { type: 'text', text: contextoLead(lead) },
    ],
    messages,
  });

  if (response.stop_reason === 'refusal') {
    return { mensajes: [], pasarACloser: true, motivo: `El modelo no ha querido responder (${response.stop_details?.category || 'sin categoría'})` };
  }
  const texto = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  try {
    const r = JSON.parse(texto);
    const mensajes = (Array.isArray(r.mensajes) ? r.mensajes : []).map((m) => String(m).trim()).filter(Boolean).slice(0, 3);
    return { mensajes, pasarACloser: Boolean(r.pasar_a_closer), motivo: String(r.motivo || '') };
  } catch {
    return { mensajes: [], pasarACloser: true, motivo: `Respuesta del modelo ilegible (${response.stop_reason})` };
  }
}
