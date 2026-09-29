import crypto from 'node:crypto';
import axios from 'axios';

/**
 * Callbell (WhatsApp Business API): verificación de webhooks y envío de mensajes.
 * Docs: https://docs.callbell.eu/api/reference/introduction
 */

const CALLBELL_API = 'https://api.callbell.eu/v1';

/** Marca que llevan los mensajes del agente, para reconocerlos cuando vuelven por el webhook. */
export const METADATA_AGENTE = { agente: 'test-nivel' };

/**
 * Comprueba la cabecera X-Callbell-Signature (t=…,v1=HMAC-SHA256 de "<t>.<cuerpo>").
 * Sin CALLBELL_WEBHOOK_SECRET no se exige firma.
 */
export function firmaValida(cuerpo, cabecera, secreto = process.env.CALLBELL_WEBHOOK_SECRET, ahora = Date.now()) {
  if (!secreto) return true;
  const partes = {};
  for (const p of String(cabecera || '').split(',')) {
    const i = p.indexOf('=');
    if (i > 0) partes[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  }
  if (!/^\d+$/.test(partes.t || '') || !partes.v1) return false;
  if (Math.abs(Math.floor(ahora / 1000) - Number(partes.t)) > 300) return false;
  const esperada = crypto.createHmac('sha256', secreto).update(`${partes.t}.`).update(cuerpo).digest('hex');
  const a = Buffer.from(esperada);
  const b = Buffer.from(partes.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Solo cifras (Callbell manda "34612345678"; guardamos igual). */
export const soloCifras = (tel) => String(tel || '').replace(/\D/g, '');

/** Envía un texto por WhatsApp. Solo vale dentro de las 24 h desde el último mensaje del alumno. */
export async function enviarTexto(telefono, texto) {
  const body = {
    to: `+${soloCifras(telefono)}`,
    from: 'whatsapp',
    type: 'text',
    content: { text: texto },
    metadata: METADATA_AGENTE,
  };
  if (process.env.CALLBELL_CHANNEL_UUID) body.channel_uuid = process.env.CALLBELL_CHANNEL_UUID;
  const { data } = await axios.post(`${CALLBELL_API}/messages/send`, body, {
    headers: { Authorization: `Bearer ${process.env.CALLBELL_API_TOKEN}`, 'Content-Type': 'application/json' },
  });
  return data;
}

/** ¿Lo ha mandado el agente? (el resto de mensajes salientes son de un closer). */
export function esDelAgente(payload) {
  let meta = payload?.metadata;
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta); } catch { meta = null; }
  }
  return meta?.agente === METADATA_AGENTE.agente;
}
