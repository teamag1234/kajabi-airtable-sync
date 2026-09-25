import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapearCompra, consolidarAccesos } from '../lib/renewal/import.js';

const offer = (title, internal = '') => ({ type: 'offers', id: '1', attributes: { title, internal_title: internal } });
const customer = { type: 'customers', id: '9', attributes: { email: 'Ana@Mail.com ', name: 'Ana Pérez' } };
const purchase = (attrs) => ({ id: 'p1', attributes: { payment_type: 'single', ...attrs } });

test('usa deactivated_at de Kajabi como fecha fin', () => {
  const r = mapearCompra({
    purchase: purchase({ effective_start_at: '2026-09-22T10:00:00Z', deactivated_at: '2027-03-22T10:00:00Z', deactivation_reason: 'access_expired' }),
    offer: offer('"DIRECTO AL APTIS EXPRESS" 1 PAGO 647€'), customer, hoy: '2026-09-22',
  });
  assert.equal(r.email, 'ana@mail.com');
  assert.equal(r.cursoKey, 'directo-express');
  assert.deepEqual([r.fechaInicio, r.fechaFin, r.fuenteFin], ['2026-09-22', '2027-03-22', 'kajabi']);
  assert.equal(r.familia, 'directo');
});

test('la compra trae importe y fecha de compra', () => {
  const r = mapearCompra({ purchase: purchase({ effective_start_at: '2026-09-22T10:00:00Z', created_at: '2026-09-22T10:00:00Z', amount_in_cents: 9700 }), offer: offer('Renovación mensual “Directo al aptis”'), customer, hoy: '2026-09-22' });
  assert.equal(r.importe, 97);
  assert.equal(r.fechaCompra, '2026-09-22');
  assert.equal(r.esRenovacion, true);
});

test('sin deactivated_at calcula con el catálogo', () => {
  const r = mapearCompra({ purchase: purchase({ effective_start_at: '2026-09-01T00:00:00Z' }), offer: offer('Aptis Level Express'), customer, hoy: '2026-09-22' });
  assert.deepEqual([r.fechaFin, r.fuenteFin], ['2026-10-21', 'catalogo']);
});

test('renovación: curso base y meses del nombre de la oferta', () => {
  const r = mapearCompra({ purchase: purchase({ effective_start_at: '2026-09-16T00:00:00Z' }), offer: offer('Renovación 6 meses Acceso a “Directo al Aptis"”'), customer, hoy: '2026-09-22' });
  assert.equal(r.cursoKey, 'directo');
  assert.equal(r.esRenovacion, true);
  assert.equal(r.fechaFin, '2027-03-16');
  const m = mapearCompra({ purchase: purchase({ effective_start_at: '2026-09-15T00:00:00Z' }), offer: offer('Renovación mensual “Directo al aptis”'), customer, hoy: '2026-09-22' });
  assert.equal(m.fechaFin, '2026-10-15');
});

test('omite ofertas fuera de catálogo, suscripciones activas y accesos ya cerrados', () => {
  assert.equal(mapearCompra({ purchase: purchase({ effective_start_at: '2026-09-01T00:00:00Z' }), offer: offer('SÁCATE EL INGLÉS'), customer, hoy: '2026-09-22' }).omitido, 'oferta no catalogada');
  assert.equal(mapearCompra({ purchase: purchase({ effective_start_at: '2026-09-01T00:00:00Z' }), offer: offer('Aptis Infinity ⭐️'), customer, hoy: '2026-09-22' }).omitido, 'oferta no catalogada');
  assert.equal(mapearCompra({ purchase: purchase({ effective_start_at: '2026-09-01T00:00:00Z', payment_type: 'subscription' }), offer: offer('Ten tu Aptis MENSUAL', 'TEN TU APTIS RENOVACIÓN MENSUAL'), customer, hoy: '2026-09-22' }).omitido, 'suscripción activa');
  assert.equal(mapearCompra({ purchase: purchase({ effective_start_at: '2026-01-01T00:00:00Z', deactivated_at: '2026-09-10T00:00:00Z', deactivation_reason: 'admin' }), offer: offer('"DIRECTO AL APTIS EXPRESS" 1 PAGO 647€'), customer, hoy: '2026-09-22' }).omitido, 'acceso terminado fuera de ventana');
  assert.equal(mapearCompra({ purchase: purchase({ effective_start_at: '2026-03-15T00:00:00Z', deactivated_at: '2026-09-16T00:00:00Z', deactivation_reason: 'access_expired' }), offer: offer('"DIRECTO AL APTIS EXPRESS" 1 PAGO 647€'), customer, hoy: '2026-09-22' }).fechaFin, '2026-09-16');
});

test('consolidarAccesos se queda con el acceso que termina más tarde por alumno y familia', () => {
  const r = consolidarAccesos([
    { email: 'a@x.com', cursoKey: 'directo-express', familia: 'directo', fechaFin: '2026-10-01' },
    { email: 'a@x.com', cursoKey: 'directo', familia: 'directo', fechaFin: '2027-03-01', esRenovacion: true },
    { email: 'a@x.com', cursoKey: 'level', familia: 'level', fechaFin: '2026-10-01' },
    { email: 'b@x.com', cursoKey: 'directo', familia: 'directo', fechaFin: '2026-12-01' },
  ]);
  assert.equal(r.length, 3);
  const a = r.find((x) => x.email === 'a@x.com' && x.familia === 'directo');
  assert.equal(a.fechaFin, '2027-03-01');
  assert.equal(a.esRenovacion, true);
});

test('una oferta gratuita con otro nombre entra si da acceso al producto del curso', () => {
  const o = { type: 'offers', id: '7', attributes: { title: 'Pack especial "ENGLISH AUTUMN"', internal_title: 'Transferencia' }, relationships: { products: { data: [{ id: '2149043351', type: 'products' }] } } };
  const r = mapearCompra({ purchase: purchase({ effective_start_at: '2026-09-01T00:00:00Z', payment_type: 'free', amount_in_cents: 0 }), offer: o, customer, hoy: '2026-09-22' });
  assert.equal(r.cursoKey, 'directo');
  assert.equal(r.fechaFin, '2027-09-01');
  const level = { type: 'offers', id: '8', attributes: { title: 'Oferta sin nombre claro', internal_title: '' }, relationships: { products: { data: [{ id: '2148852898', type: 'products' }] } } };
  assert.equal(mapearCompra({ purchase: purchase({ effective_start_at: '2026-09-01T00:00:00Z' }), offer: level, customer, hoy: '2026-09-22' }).cursoKey, 'level');
  const nada = { type: 'offers', id: '9', attributes: { title: 'Masterclass', internal_title: '' }, relationships: { products: { data: [{ id: '999', type: 'products' }] } } };
  assert.equal(mapearCompra({ purchase: purchase({ effective_start_at: '2026-09-01T00:00:00Z' }), offer: nada, customer, hoy: '2026-09-22' }).omitido, 'oferta no catalogada');
});

test('el nombre manda sobre el producto para elegir la variante', () => {
  const o = { type: 'offers', id: '7', attributes: { title: '"DIRECTO AL APTIS EXPRESS TUTORIZADO"', internal_title: 'TRANSFERENCIA' }, relationships: { products: { data: [{ id: '2149043351', type: 'products' }] } } };
  assert.equal(mapearCompra({ purchase: purchase({ effective_start_at: '2026-09-01T00:00:00Z', payment_type: 'free' }), offer: o, customer, hoy: '2026-09-22' }).cursoKey, 'directo-express-tutorizado');
});
