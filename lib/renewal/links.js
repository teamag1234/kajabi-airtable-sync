import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Enlaces firmados para los botones del email ("Ya lo he conseguido"). El
 * token lleva email y curso firmados con HMAC, así el enlace es público pero
 * no se puede falsificar ni cambiar de alumno.
 */
function secreto() {
  const s = process.env.RENEWAL_LINK_SECRET || process.env.CRON_SECRET;
  if (!s) throw new Error('Falta RENEWAL_LINK_SECRET o CRON_SECRET para firmar enlaces');
  return s;
}

const b64 = (buf) => Buffer.from(buf).toString('base64url');

function firmar(payload) {
  return b64(createHmac('sha256', secreto()).update(payload).digest());
}

export function crearTokenAprobado({ email, cursoKey }) {
  const payload = JSON.stringify({ e: String(email || '').trim().toLowerCase(), c: String(cursoKey || '') });
  const p = b64(payload);
  return `${p}.${firmar(p)}`;
}

/** Devuelve { email, cursoKey } o null si el token no es válido. */
export function verificarTokenAprobado(token) {
  try {
    const [p, sig] = String(token || '').split('.');
    if (!p || !sig) return null;
    const esperada = firmar(p);
    const a = Buffer.from(sig);
    const b = Buffer.from(esperada);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const { e, c } = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (!e) return null;
    return { email: e, cursoKey: c || '' };
  } catch {
    return null;
  }
}

export function appUrl() {
  return (process.env.APP_URL || 'https://kajabi-airtable-sync-d9nm.vercel.app').replace(/\/$/, '');
}

export function urlAprobado({ email, cursoKey }) {
  return `${appUrl()}/api/renewal-aprobado?t=${encodeURIComponent(crearTokenAprobado({ email, cursoKey }))}`;
}

export const ENLACES = {
  resenaGoogle: process.env.GOOGLE_REVIEW_URL || 'https://share.google/w1VCDqaZGuvci7V9R',
  whatsappJesu: (texto) => `https://wa.me/34601900596?text=${encodeURIComponent(texto)}`,
  logo: process.env.EMAIL_LOGO_URL || 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2163471974/settings_images/2d0b647-52ee-db6-603f-c7a88b8cebcc_8.png',
};
