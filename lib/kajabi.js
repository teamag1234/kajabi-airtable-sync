import axios from 'axios';

const KAJABI_API_BASE = 'https://api.kajabi.com/v1';
const USER_AGENT = 'kajabi-airtable-sync/1.0';

let tokenCache = { token: null, expiresAt: 0 };

/**
 * Token OAuth (client credentials) de la API pública de Kajabi. Se cachea en
 * memoria hasta poco antes de caducar. Requiere KAJABI_CLIENT_ID y
 * KAJABI_CLIENT_SECRET.
 */
export async function getKajabiAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const clientId = process.env.KAJABI_CLIENT_ID;
  const clientSecret = process.env.KAJABI_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Faltan KAJABI_CLIENT_ID / KAJABI_CLIENT_SECRET');

  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret });
  const response = await axios.post(`${KAJABI_API_BASE}/oauth/token`, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
  });
  const { access_token: token, expires_in: expiresIn } = response.data;
  const ttlMs = (Number(expiresIn) || 6 * 24 * 3600) * 1000;
  tokenCache = { token, expiresAt: Date.now() + ttlMs - 5 * 60 * 1000 };
  return token;
}

async function kajabiGet(url, params) {
  const token = await getKajabiAccessToken();
  for (let intento = 0; intento < 4; intento++) {
    try {
      const response = await axios.get(url, {
        params,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.api+json', 'User-Agent': USER_AGENT },
        // Kajabi usa page[size] y filter[x]: no codificar los corchetes
        paramsSerializer: { encode: (v) => encodeURIComponent(v).replace(/%5B/g, '[').replace(/%5D/g, ']') },
      });
      return response.data;
    } catch (error) {
      const status = error.response && error.response.status;
      if (status === 429 && intento < 3) {
        await new Promise((r) => setTimeout(r, 1500 * (intento + 1)));
        continue;
      }
      throw error;
    }
  }
}

/**
 * Recorre las compras (purchases) de Kajabi ordenadas por `orden`
 * ('-created_at' o '-updated_at') e incluye oferta y cliente. Se detiene en
 * cuanto la fecha del campo de orden es anterior a `desde` (YYYY-MM-DD).
 * Devuelve { purchases, included } donde included es un mapa "type:id" → objeto.
 */
export async function getKajabiPurchases({ desde, orden = '-created_at', pageSize = 200, onPage } = {}) {
  const campo = orden.replace(/^-/, '');
  const included = new Map();
  const purchases = [];
  let url = `${KAJABI_API_BASE}/purchases`;
  let params = { sort: orden, include: 'offer,customer', 'page[size]': pageSize };
  let pagina = 0;

  while (url) {
    const data = await kajabiGet(url, params);
    pagina++;
    for (const inc of data.included || []) included.set(`${inc.type}:${inc.id}`, inc);
    let parar = false;
    for (const p of data.data || []) {
      if (desde && String(p.attributes[campo] || '').slice(0, 10) < desde) { parar = true; break; }
      purchases.push(p);
    }
    if (onPage) onPage({ pagina, acumuladas: purchases.length });
    if (parar) break;
    url = data.links && data.links.next;
    params = undefined; // el enlace next ya lleva los parámetros
  }

  return { purchases, included };
}

// --- Funciones heredadas del sync de pagos (API antigua). Se mantienen para no
// --- romper importaciones existentes; la API pública actual no expone /payments.
export async function getKajabiPayments(daysBack = 1) {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  const desde = since.toISOString().split('T')[0];
  const { purchases, included } = await getKajabiPurchases({ desde });
  return purchases.map((p) => {
    const offer = included.get(`offers:${p.relationships.offer?.data?.id}`);
    const customer = included.get(`customers:${p.relationships.customer?.data?.id}`);
    return {
      id: p.id,
      amount: p.attributes.amount_in_cents,
      created_at: p.attributes.created_at,
      customer_id: p.relationships.customer?.data?.id,
      offer_title: offer ? offer.attributes.title : '',
      _customer: customer,
    };
  });
}

export async function getKajabiCustomer(customerId) {
  const data = await kajabiGet(`${KAJABI_API_BASE}/customers/${customerId}`);
  const a = data.data.attributes;
  const [first_name, ...rest] = String(a.name || '').split(' ');
  return { id: data.data.id, email: a.email, first_name, last_name: rest.join(' '), phone: '', created_at: a.created_at };
}

export async function getKajabiOrders() {
  return [];
}
