import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extraerAccesosConcedidos } from '../lib/renewal/grants.js';
import { buscarCursoPorOferta } from '../lib/renewal/courses.js';

test('extraerAccesosConcedidos devuelve solo ofertas de curso vigentes por cliente', () => {
  const offers = new Map([
    ['1', { id: '1', attributes: { title: 'Directo al Aptis Express 2026/27' }, relationships: { products: { data: [] } } }],
    ['2', { id: '2', attributes: { title: 'Taller: 10 folios para un 10' }, relationships: { products: { data: [] } } }],
    ['3', { id: '3', attributes: { title: 'Renovación mensual “Directo al aptis”' }, relationships: { products: { data: [] } } }],
    ['4', { id: '4', attributes: { title: 'Oferta rara', internal_title: '' }, relationships: { products: { data: [{ id: '2149043351' }] } } }],
  ]);
  const customers = [
    { id: 'c1', attributes: { email: 'Ana@Mail.com', name: 'Ana' }, relationships: { offers: { data: [{ id: '1' }, { id: '2' }, { id: '3' }] } } },
    { id: 'c2', attributes: { email: 'bea@mail.com', name: 'Bea' }, relationships: { offers: { data: [{ id: '4' }] } } },
    { id: 'c3', attributes: { email: '', name: 'Sin email' }, relationships: { offers: { data: [{ id: '1' }] } } },
  ];
  const r = extraerAccesosConcedidos({ customers, offers });
  assert.deepEqual(r.map((x) => [x.email, x.curso.key, x.clave]), [['ana@mail.com', 'directo-express', 'c1|1'], ['bea@mail.com', 'directo', 'c2|4']]);
});

test('reservas de clase, talleres y cambios de tarjeta no son cursos', () => {
  assert.equal(buscarCursoPorOferta('Reserva de clase Aptis Accelerator con Virginia'), null);
  assert.equal(buscarCursoPorOferta('CAMBIO TARJETA "DIRECTOS AL APTIS" 6 PAGOS 117€'), null);
  assert.equal(buscarCursoPorOferta('Taller: 10 folios para un 10'), null);
  assert.equal(buscarCursoPorOferta('1 Sesión individual de SPEAKING'), null);
});
