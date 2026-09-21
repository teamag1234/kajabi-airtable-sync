import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elegirPaso, estaCerrado, generarEmail, PASOS } from '../lib/renewal/sequence.js';
import { buscarCursoPorOferta, buscarCurso, buscarRenovacionPorOferta, getOfertasRenovacion } from '../lib/renewal/courses.js';

test('elegirPaso manda cada paso el día que toca y solo una vez', () => {
  assert.equal(elegirPaso(-10, 0), null);
  assert.equal(elegirPaso(-7, 0).paso, 1);
  assert.equal(elegirPaso(-7, 1), null);
  assert.equal(elegirPaso(-5, 1), null);
  assert.equal(elegirPaso(-3, 1).paso, 2);
  assert.equal(elegirPaso(-1, 2).paso, 3);
  assert.equal(elegirPaso(0, 3).paso, 4);
  assert.equal(elegirPaso(3, 4).paso, 5);
  assert.equal(elegirPaso(6, 5).paso, 6);
  assert.equal(elegirPaso(7, 6).paso, 7);
  assert.equal(elegirPaso(7, 7), null);
  assert.equal(elegirPaso(8, 7), null);
});

test('si hay pasos atrasados solo se manda el más reciente', () => {
  assert.equal(elegirPaso(0, 0).paso, 4);
  assert.equal(elegirPaso(2, 1).paso, 4);
  assert.equal(elegirPaso(7, 0).paso, 7);
});

test('estaCerrado pasada la fecha límite', () => {
  assert.equal(estaCerrado(7), false);
  assert.equal(estaCerrado(8), true);
});

test('la secuencia tiene 7 pasos entre -7 y +7', () => {
  assert.equal(PASOS.length, 7);
  assert.deepEqual(PASOS.map((p) => p.offset), [-7, -3, -1, 0, 3, 6, 7]);
});

const ctxBase = {
  nombre: 'María López',
  curso: 'Curso APTIS 6 meses',
  fechaFin: '2026-09-24',
  fechaLimite: '2026-10-01',
  ofertas: getOfertasRenovacion({ RENEWAL_PRICE_1M: '47', RENEWAL_URL_1M: 'https://x/1m', RENEWAL_PRICE_6M: '97', RENEWAL_URL_6M: 'https://x/6m' }),
};

test('generarEmail produce asunto, texto y html personalizados en cada paso', () => {
  for (const p of PASOS) {
    const diasDesdeFin = p.offset;
    const mail = generarEmail(p.paso, { ...ctxBase, diasHastaFin: -diasDesdeFin, diasHastaLimite: 7 - diasDesdeFin });
    assert.ok(mail.asunto.length > 5, `paso ${p.paso} sin asunto`);
    assert.match(mail.texto, /Hola María,/);
    assert.match(mail.html, /Curso APTIS 6 meses/);
    assert.match(mail.html, /https:\/\/x\/1m/);
    assert.match(mail.html, /47 €/);
    assert.match(mail.html, /#FFBD59/);
    assert.match(mail.html, /Poppins/);
    assert.match(mail.texto, /Jesu$/);
  }
});

test('el copy usa los días reales para quien entra a mitad de ventana', () => {
  const tarde = generarEmail(4, { ...ctxBase, diasHastaFin: -2, diasHastaLimite: 5 });
  assert.match(tarde.asunto, /se ha cerrado/);
  assert.match(tarde.texto, /se cerró el jueves 24 de septiembre/);
  const hoy = generarEmail(4, { ...ctxBase, diasHastaFin: 0, diasHastaLimite: 7 });
  assert.match(hoy.asunto, /Hoy termina/);
  const primero = generarEmail(1, { ...ctxBase, diasHastaFin: 5, diasHastaLimite: 12 });
  assert.match(primero.asunto, /5 días/);
});

test('sin precio configurado se habla de precio de alumno', () => {
  const mail = generarEmail(2, { ...ctxBase, ofertas: getOfertasRenovacion({}), diasHastaFin: 3, diasHastaLimite: 10 });
  assert.match(mail.html, /precio de alumno/);
});

test('catálogo: detección de cursos y renovaciones por nombre de oferta', () => {
  assert.equal(buscarCursoPorOferta('"DIRECTO AL APTIS EXPRESS" 1 PAGO 647€').key, 'directo-express');
  assert.equal(buscarCursoPorOferta('"DIRECTO AL APTIS" 1 PAGO 747€').key, 'directo');
  assert.equal(buscarCursoPorOferta('"DIRECTO AL APTIS EXPRESS TUTORIZADO" 1').key, 'directo-express-tutorizado');
  assert.equal(buscarCursoPorOferta('Acceso a “Aptis Expert”  12 pagos 77€').key, 'expert');
  assert.equal(buscarCursoPorOferta('"APTIS EXPERT EXPRESS" 6 PAGOS 117€').key, 'expert-express');
  assert.equal(buscarCursoPorOferta('Aptis Level - Policía Nacional ').key, 'level-policia');
  assert.equal(buscarCursoPorOferta('Aptis Level Express').key, 'level-express');
  assert.equal(buscarCursoPorOferta('Aptis Infinity ⭐️').key, 'infinity');
  assert.equal(buscarCursoPorOferta('Masterclass gratis'), null);
  assert.equal(buscarCurso('directo-tutorizado').meses, 12);
  assert.equal(buscarCurso('Directo al Aptis Turbo Pro').meses, 4);
  assert.equal(buscarRenovacionPorOferta('Renovacion 6 meses').meses, 6);
  assert.equal(buscarRenovacionPorOferta('Renovación cada 6 meses Acceso a “Aptis Expert”').meses, 6);
  assert.equal(buscarRenovacionPorOferta('Renovación 1 año').meses, 12);
});
