import { verificarTokenAprobado, conUtms } from '../../../lib/renewal/links.js';
import { registrarClic } from '../../../lib/renewal/logic.js';
import { buscarCurso, ofertaRenovacionPorKey } from '../../../lib/renewal/courses.js';

export const dynamic = 'force-dynamic';

/**
 * Enlace de las ofertas de renovación en el email. Registra el clic en la fila
 * del alumno y redirige al checkout de Kajabi con UTMs. Si algo falla, redirige
 * igualmente: el clic nunca debe impedir la compra.
 */
export async function GET(req) {
  const url = new URL(req.url);
  const datos = verificarTokenAprobado(url.searchParams.get('t'));
  const ofertaKey = url.searchParams.get('o') || '';
  const paso = Number(url.searchParams.get('p') || 0);

  const curso = datos ? buscarCurso(datos.cursoKey) : null;
  const oferta = curso ? ofertaRenovacionPorKey(curso, ofertaKey) : null;
  const destino = oferta ? conUtms(oferta.url, { paso, ofertaKey }) : 'https://www.agacademyaptis.com';

  if (datos && oferta) {
    try {
      await registrarClic({ email: datos.email, cursoKey: datos.cursoKey, ofertaKey, paso });
    } catch (error) {
      console.error('Error registrando clic:', error.message);
    }
  }

  return new Response(null, { status: 302, headers: { Location: destino, 'Cache-Control': 'no-store' } });
}
