/**
 * Autorización compartida por los endpoints. Si CRON_SECRET está definido se
 * exige `Authorization: Bearer <CRON_SECRET>` (Vercel Cron lo envía solo).
 * Si no está definido, los endpoints quedan abiertos (comportamiento previo).
 */
export function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const authHeader = req.headers.get('authorization') || '';
  return authHeader === `Bearer ${secret}`;
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
