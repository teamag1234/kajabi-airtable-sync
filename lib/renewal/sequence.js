import { formatearLargo, formatearCorto, sumarDias } from './dates.js';

/**
 * Pasos de la secuencia. `offset` son días respecto a la fecha de fin de
 * acceso (negativo = antes de que termine). El paso 7 coincide con la fecha
 * límite de renovación (fin + 7). Pasada esa fecha la fila se cierra.
 */
export const PASOS = [
  { paso: 1, offset: -7, id: 'una-semana' },
  { paso: 2, offset: -3, id: 'tres-dias' },
  { paso: 3, offset: -1, id: 'manana-cierra-acceso' },
  { paso: 4, offset: 0, id: 'hoy-termina' },
  { paso: 5, offset: 3, id: 'quedan-dias' },
  { paso: 6, offset: 6, id: 'manana-cierra-renovacion' },
  { paso: 7, offset: 7, id: 'ultimo-dia' },
];

export const PRIMER_OFFSET = PASOS[0].offset;
export const ULTIMO_OFFSET = PASOS[PASOS.length - 1].offset;

/**
 * Decide qué paso toca hoy.
 * - diasDesdeFin: hoy - fechaFin (negativo antes del fin).
 * - ultimoPasoEnviado: número del último paso ya enviado (0 si ninguno).
 * Devuelve el paso a enviar o null. Si hay varios pasos atrasados solo
 * devuelve el más reciente, nunca los acumula.
 */
export function elegirPaso(diasDesdeFin, ultimoPasoEnviado = 0) {
  if (diasDesdeFin < PRIMER_OFFSET || diasDesdeFin > ULTIMO_OFFSET) return null;
  const vencidos = PASOS.filter((p) => p.offset <= diasDesdeFin);
  if (vencidos.length === 0) return null;
  const candidato = vencidos[vencidos.length - 1];
  return candidato.paso > (ultimoPasoEnviado || 0) ? candidato : null;
}

export function estaCerrado(diasDesdeFin) {
  return diasDesdeFin > ULTIMO_OFFSET;
}

function dias(n) {
  return n === 1 ? '1 día' : `${n} días`;
}

function primerNombre(nombre) {
  const n = String(nombre || '').trim();
  if (!n) return '';
  return n.split(/\s+/)[0];
}

/**
 * ctx: { nombre, curso, fechaFin, fechaLimite, diasHastaFin, diasHastaLimite, ofertas }
 * Los textos usan los números reales para que sigan siendo correctos aunque
 * un alumno entre en la secuencia a mitad de ventana.
 */
export function generarEmail(paso, ctx) {
  const n = primerNombre(ctx.nombre) || 'hola';
  const saludo = primerNombre(ctx.nombre) ? `Hola ${n},` : 'Hola,';
  const finLargo = formatearLargo(ctx.fechaFin);
  const limiteLargo = formatearLargo(ctx.fechaLimite);
  const hf = ctx.diasHastaFin;
  const hl = ctx.diasHastaLimite;

  const cuandoTermina = hf > 1 ? `termina en ${dias(hf)}, el ${finLargo}` : hf === 1 ? `termina mañana, ${finLargo}` : hf === 0 ? 'se cierra hoy' : `se cerró el ${finLargo}`;
  const cuandoLimite = hl > 1 ? `hasta el ${limiteLargo}` : hl === 1 ? 'hasta mañana' : 'hasta esta noche';
  const antesDelLimite = hl > 1 ? `antes del ${limiteLargo}` : hl === 1 ? 'antes de mañana por la noche' : 'hoy mismo';

  let asunto;
  let parrafos;

  switch (paso) {
    case 1:
      asunto = `${n !== 'hola' ? n + ', t' : 'T'}e queda${hf === 1 ? '' : 'n'} ${dias(hf)} de acceso`;
      parrafos = [
        `Te escribo porque tu acceso a ${ctx.curso} ${cuandoTermina}.`,
        'Si ya tienes el APTIS, enhorabuena y olvida este email. Si todavía no, no quiero que se te cierre la puerta a mitad de camino.',
        'Por eso te dejo una opción que solo existe para quien ya está dentro: renovar unos meses más a un precio que no verás en ningún otro sitio.',
        '{{OFERTAS}}',
        `Esta opción se cierra el ${limiteLargo}, ${cuandoLimite === 'hasta esta noche' ? 'hoy mismo' : '7 días después de que termine tu acceso'}. Luego desaparece.`,
      ];
      break;
    case 2:
      asunto = hf > 0 ? `Quedan ${dias(hf)} de acceso` : 'Sobre tu acceso al curso';
      parrafos = [
        `Rápido: tu acceso a ${ctx.curso} ${cuandoTermina}.`,
        'Has puesto dinero, horas y ganas en esto. Sería una pena que se quedara a medias por una fecha en el calendario.',
        `Tienes la renovación abierta ${cuandoLimite} con precio de alumno:`,
        '{{OFERTAS}}',
      ];
      break;
    case 3:
      asunto = hf === 1 ? 'Mañana se cierra tu acceso' : `Tu acceso ${cuandoTermina}`;
      parrafos = [
        `Tu acceso a ${ctx.curso} ${cuandoTermina}.`,
        `No hace falta decidir hoy. Tienes ${cuandoLimite} para renovar con precio de alumno, pero prefiero avisarte antes de que te encuentres la plataforma cerrada.`,
        '{{OFERTAS}}',
      ];
      break;
    case 4:
      asunto = hf === 0 ? 'Hoy termina tu acceso, y esto es lo que puedes hacer' : 'Tu acceso se ha cerrado, y esto es lo que puedes hacer';
      parrafos = [
        `Tu acceso a ${ctx.curso} ${cuandoTermina}.`,
        `Todo lo que has avanzado sigue ahí. Tu progreso, tus simulacros, tus correcciones. Si renuevas ${antesDelLimite}, lo recuperas tal cual lo dejaste.`,
        '{{OFERTAS}}',
        `A partir del ${formatearLargo(sumarDias(ctx.fechaLimite, 1))} esta opción ya no está.`,
      ];
      break;
    case 5:
      asunto = hl > 1 ? `Te quedan ${dias(hl)} para renovar` : hl === 1 ? 'Te queda 1 día para renovar' : 'Último día para renovar';
      parrafos = [
        'Han pasado unos días desde que se cerró tu acceso y quería preguntarte una cosa: ¿ya lo has conseguido?',
        'Si sí, cuéntamelo, que me alegro de verdad.',
        `Si no, tienes ${cuandoLimite} para retomarlo donde lo dejaste con el precio de renovación. Después ya solo queda la opción de empezar de cero, y no es lo mismo.`,
        '{{OFERTAS}}',
      ];
      break;
    case 6:
      asunto = hl === 1 ? 'Mañana se cierra la renovación' : `La renovación se cierra ${cuandoLimite.replace('hasta ', '')}`;
      parrafos = [
        `${hl === 1 ? `Mañana, ${limiteLargo},` : `El ${limiteLargo}`} es el último día para renovar tu acceso a ${ctx.curso} con precio de alumno.`,
        `No te voy a contar nada nuevo. Ya sabes lo que has invertido y lo que te falta. Solo te digo que la puerta sigue abierta ${hl === 1 ? '24 horas más' : 'unos días más'}.`,
        '{{OFERTAS}}',
      ];
      break;
    case 7:
    default:
      asunto = 'Último día';
      parrafos = [
        'Hoy es el último día. Esta noche se cierra la renovación y ya no te volveré a escribir sobre esto.',
        'Si lo tuyo es retomarlo, es ahora:',
        '{{OFERTAS}}',
        'Y si no, sin problema. Gracias por haber confiado en nosotros, y mucha suerte con el APTIS.',
      ];
      break;
  }

  const firma = process.env.EMAIL_SIGNATURE || 'Jesu';
  const texto = [saludo, ...parrafos.map((p) => (p === '{{OFERTAS}}' ? ofertasTexto(ctx.ofertas) : p)), firma].join('\n\n');
  const html = renderHtml({ saludo, parrafos, firma, ctx });

  return { paso, asunto, texto, html };
}

function precioTexto(o) {
  return o.precio ? `${o.precio} €` : 'precio de alumno';
}

const SIN_OFERTAS = 'Responde a este email y te digo cómo renovar.';
const KLARNA = 'Pago único. Si lo prefieres, al pagar puedes fraccionarlo en 3 con Klarna.';

function ofertasTexto(ofertas) {
  if (!ofertas || ofertas.length === 0) return SIN_OFERTAS;
  return ofertas.map((o) => `· ${o.etiqueta}: ${precioTexto(o)} → ${o.url}`).join('\n') + `\n${KLARNA}`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function ofertasHtml(ofertas) {
  if (!ofertas || ofertas.length === 0) {
    return `<p style="margin:0 0 16px 0;font-family:Poppins,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1f2937;">${SIN_OFERTAS}</p>`;
  }
  const filas = ofertas
    .map(
      (o) => `
        <tr>
          <td style="padding:6px 0;">
            <a href="${escapeHtml(o.url)}" style="display:block;background:#FFBD59;color:#0a0e27;text-decoration:none;font-weight:600;font-family:Poppins,Arial,Helvetica,sans-serif;font-size:15px;padding:14px 18px;border-radius:8px;text-align:center;">
              ${escapeHtml(o.etiqueta)} &nbsp;·&nbsp; ${escapeHtml(precioTexto(o))}
            </a>
          </td>
        </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 4px 0;">${filas}</table>
      <p style="margin:0 0 16px 0;font-family:Poppins,Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#6b7280;">${KLARNA}</p>`;
}

function renderHtml({ saludo, parrafos, firma, ctx }) {
  const cuerpo = parrafos
    .map((p) =>
      p === '{{OFERTAS}}'
        ? ofertasHtml(ctx.ofertas)
        : `<p style="margin:0 0 16px 0;font-family:Poppins,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1f2937;">${escapeHtml(p)}</p>`
    )
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
<title>${escapeHtml(ctx.curso)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f7;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr>
    <td style="background:#0a0e27;padding:18px 28px;">
      <span style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.5px;color:#FFBD59;">AG ACADEMY</span>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 28px 8px 28px;">
      <p style="margin:0 0 16px 0;font-family:Poppins,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1f2937;">${escapeHtml(saludo)}</p>
      ${cuerpo}
      <p style="margin:8px 0 0 0;font-family:Poppins,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1f2937;">${escapeHtml(firma)}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 28px 24px 28px;">
      <p style="margin:0;font-family:Poppins,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;">
        Acceso a ${escapeHtml(ctx.curso)} hasta el ${escapeHtml(formatearCorto(ctx.fechaFin))}. Renovación disponible hasta el ${escapeHtml(formatearCorto(ctx.fechaLimite))}.
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
