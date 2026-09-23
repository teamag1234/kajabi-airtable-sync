import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.CRON_SECRET = 'secreto-de-prueba';
const { crearTokenAprobado, verificarTokenAprobado, urlAprobado, urlClic, conUtms } = await import('../lib/renewal/links.js');

test('el token firmado se verifica y devuelve email y curso', () => {
  const t = crearTokenAprobado({ email: 'Ana@Mail.com', cursoKey: 'directo' });
  assert.deepEqual(verificarTokenAprobado(t), { email: 'ana@mail.com', cursoKey: 'directo' });
});

test('un token manipulado o con otro secreto no vale', () => {
  const t = crearTokenAprobado({ email: 'ana@mail.com', cursoKey: 'directo' });
  const [p, sig] = t.split('.');
  assert.equal(verificarTokenAprobado(`${p}.${sig.slice(0, -2)}xx`), null);
  const otro = Buffer.from(JSON.stringify({ e: 'otra@mail.com', c: 'directo' })).toString('base64url');
  assert.equal(verificarTokenAprobado(`${otro}.${sig}`), null);
  assert.equal(verificarTokenAprobado(''), null);
  assert.equal(verificarTokenAprobado('basura'), null);
});

test('urlAprobado apunta a la página pública con el token', () => {
  const u = urlAprobado({ email: 'ana@mail.com', cursoKey: 'level' });
  assert.match(u, /\/api\/renewal-aprobado\?t=/);
  const t = decodeURIComponent(u.split('t=')[1]);
  assert.equal(verificarTokenAprobado(t).cursoKey, 'level');
});

test('urlClic lleva token, oferta y paso; conUtms añade las UTMs de la secuencia', () => {
  const u = new URL(urlClic({ email: 'ana@mail.com', cursoKey: 'directo', ofertaKey: '6m', paso: 4 }));
  assert.equal(u.pathname, '/api/renewal-click');
  assert.equal(u.searchParams.get('o'), '6m');
  assert.equal(u.searchParams.get('p'), '4');
  assert.equal(verificarTokenAprobado(u.searchParams.get('t')).email, 'ana@mail.com');
  const c = new URL(conUtms('https://www.agacademyaptis.com/offers/ZT5ookpW', { paso: 4, ofertaKey: '6m' }));
  assert.equal(c.searchParams.get('utm_source'), 'email');
  assert.equal(c.searchParams.get('utm_medium'), 'renovacion');
  assert.equal(c.searchParams.get('utm_campaign'), 'renovacion-paso-4');
  assert.equal(c.searchParams.get('utm_content'), '6m');
});
