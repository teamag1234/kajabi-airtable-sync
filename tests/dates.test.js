import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sumarMeses, sumarDias, diferenciaDias, calcularFechas, hoyMadrid, formatearLargo } from '../lib/renewal/dates.js';

test('sumarMeses respeta fin de mes', () => {
  assert.equal(sumarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(sumarMeses('2024-01-31', 1), '2024-02-29');
  assert.equal(sumarMeses('2026-03-15', 3), '2026-06-15');
  assert.equal(sumarMeses('2026-09-17', 4), '2027-01-17');
  assert.equal(sumarMeses('2026-05-31', 6), '2026-11-30');
  assert.equal(sumarMeses('2026-02-28', 12), '2027-02-28');
});

test('sumarDias y diferenciaDias no se ven afectados por el cambio de hora', () => {
  assert.equal(sumarDias('2026-03-28', 3), '2026-03-31');
  assert.equal(sumarDias('2026-10-24', 7), '2026-10-31');
  assert.equal(diferenciaDias('2026-03-28', '2026-03-31'), 3);
  assert.equal(diferenciaDias('2026-10-31', '2026-10-24'), -7);
});

test('calcularFechas devuelve fin y límite (fin + 7), en meses o en días', () => {
  assert.deepEqual(calcularFechas('2026-06-01', 3), {
    fechaInicio: '2026-06-01',
    fechaFin: '2026-09-01',
    fechaLimite: '2026-09-08',
  });
  assert.deepEqual(calcularFechas('2026-06-01', { meses: 12 }), {
    fechaInicio: '2026-06-01',
    fechaFin: '2027-06-01',
    fechaLimite: '2027-06-08',
  });
  assert.deepEqual(calcularFechas('2026-09-22', { dias: 50 }), {
    fechaInicio: '2026-09-22',
    fechaFin: '2026-11-11',
    fechaLimite: '2026-11-18',
  });
  assert.throws(() => calcularFechas('2026-09-22', {}));
});

test('hoyMadrid devuelve la fecha peninsular aunque UTC vaya por detrás', () => {
  // 23:30 UTC del 16 de septiembre = 01:30 del 17 en Madrid (CEST)
  assert.equal(hoyMadrid(new Date('2026-09-16T23:30:00Z')), '2026-09-17');
  // 23:30 UTC del 10 de diciembre = 00:30 del 11 en Madrid (CET)
  assert.equal(hoyMadrid(new Date('2026-12-10T23:30:00Z')), '2026-12-11');
});

test('formatearLargo en español', () => {
  assert.equal(formatearLargo('2026-09-22'), 'martes 22 de septiembre');
});
