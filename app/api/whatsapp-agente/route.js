import { after } from 'next/server';
import { firmaValida } from '../../../lib/whatsapp/callbell.js';
import { procesarEvento } from '../../../lib/whatsapp/procesar.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ok = () => new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

/**
 * Webhook de Callbell (evento message_created). Responde al momento y procesa
 * el mensaje después (after), para que Callbell no reintente por tardar.
 * Con AGENTE_ACTIVO distinto de "1" no hace nada: es el interruptor general.
 */
export async function POST(req) {
  const cuerpo = await req.text();
  if (!firmaValida(cuerpo, req.headers.get('x-callbell-signature'))) {
    return new Response(JSON.stringify({ error: 'Firma no válida' }), { status: 401 });
  }
  if (process.env.AGENTE_ACTIVO !== '1') return ok();

  let evento;
  try {
    evento = JSON.parse(cuerpo);
  } catch {
    return ok(); // comprobaciones de conexión de Callbell
  }

  after(async () => {
    try {
      const r = await procesarEvento(evento);
      if (r.accion !== 'ignorado' && r.accion !== 'no viene del test') console.log('Agente WhatsApp:', JSON.stringify(r));
    } catch (error) {
      console.error('Error en el agente de WhatsApp:', error.response?.data || error.message);
    }
  });
  return ok();
}

export function GET() {
  return ok();
}
