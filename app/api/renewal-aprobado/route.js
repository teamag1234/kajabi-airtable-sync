import { verificarTokenAprobado, ENLACES } from '../../../lib/renewal/links.js';
import { actualizarEstadoAlumno } from '../../../lib/renewal/logic.js';

export const dynamic = 'force-dynamic';

/**
 * Página pública a la que lleva el botón "Ya lo he conseguido" del email.
 * Verifica el token firmado, marca Aprobado en Airtable (deja de recibir la
 * secuencia) y pide una reseña en Google o un WhatsApp a Jesu.
 */
export async function GET(req) {
  const url = new URL(req.url);
  const datos = verificarTokenAprobado(url.searchParams.get('t'));
  if (!datos) return html(pagina({ titulo: 'Este enlace no es válido', cuerpo: '<p>Puede que esté incompleto. Abre el email de nuevo y pulsa el botón, o escríbenos y lo arreglamos.</p>', ok: false }), 400);

  let marcado = false;
  try {
    const r = await actualizarEstadoAlumno({ email: datos.email, curso: datos.cursoKey || undefined, aprobado: true });
    marcado = r.accion === 'actualizado';
  } catch (error) {
    console.error('Error marcando aprobado:', error.message);
  }

  const wa = ENLACES.whatsappJesu('Hola Jesu, ¡he conseguido el APTIS! Te cuento qué me ha parecido el curso: ');
  const cuerpo = `
    <p>Qué alegría. Ya no te volveremos a escribir sobre la renovación${marcado ? '' : ' (si te llega algún email más, ignóralo, ya nos encargamos)'}.</p>
    <p>Ahora un favor. Nos ayuda muchísimo que cuentes tu experiencia, y son dos minutos. Elige lo que te venga mejor:</p>
    <p style="margin:24px 0 10px 0;"><a class="btn" href="${ENLACES.resenaGoogle}" target="_blank" rel="noopener">Dejar una reseña en Google</a></p>
    <p style="margin:0 0 24px 0;"><a class="btn btn2" href="${wa}" target="_blank" rel="noopener">Contárselo a Jesu por WhatsApp</a></p>
    <p class="small">Si además tienes una foto o vídeo con el título, mándasela a Jesu por WhatsApp. Nos hace ilusión.</p>
  `;
  return html(pagina({ titulo: '¡Enhorabuena!', cuerpo, ok: true }));
}

function pagina({ titulo, cuerpo, ok }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${titulo} · AG Academy</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  body{margin:0;background:#0a0e27;font-family:Poppins,Arial,Helvetica,sans-serif;color:#1f2937}
  .ag-wrap{max-width:560px;margin:0 auto;padding:32px 16px}
  .ag-logo{text-align:center;margin-bottom:20px}
  .ag-logo img{width:180px;max-width:60%;height:auto}
  .ag-card{background:#fff;border-radius:14px;padding:32px 28px}
  h1{margin:0 0 16px 0;font-size:26px;color:#0a0e27}
  p{font-size:16px;line-height:1.55;margin:0 0 14px 0}
  .btn{display:block;text-align:center;background:#FFBD59;color:#0a0e27;text-decoration:none;font-weight:600;padding:14px 18px;border-radius:8px}
  .btn2{background:#0a0e27;color:#FFBD59}
  .small{font-size:13px;color:#6b7280}
</style>
</head>
<body>
<div class="ag-wrap">
  <div class="ag-logo"><img src="${ENLACES.logo}" alt="AG Academy"></div>
  <div class="ag-card">
    <h1>${ok ? '🎉 ' : ''}${titulo}</h1>
    ${cuerpo}
  </div>
</div>
</body>
</html>`;
}

function html(body, status = 200) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
