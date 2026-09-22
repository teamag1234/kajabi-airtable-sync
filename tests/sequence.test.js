import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elegirPaso, estaCerrado, generarEmail, PASOS, primerNombre } from '../lib/renewal/sequence.js';
import { buscarCursoPorOferta, buscarCurso, buscarRenovacionPorOferta, ofertasRenovacionDeCurso, duracionCurso, duracionTexto } from '../lib/renewal/courses.js';

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

process.env.CRON_SECRET = process.env.CRON_SECRET || 'secreto-de-prueba';

const ctxBase = {
  urlAprobado: 'https://ejemplo.test/api/renewal-aprobado?t=abc.def',
  nombre: 'María López',
  curso: 'Curso APTIS 6 meses',
  fechaFin: '2026-09-24',
  fechaLimite: '2026-10-01',
  ofertas: ofertasRenovacionDeCurso(buscarCurso('directo-express')),
};

test('generarEmail produce asunto, texto y html personalizados en cada paso', () => {
  for (const p of PASOS) {
    const diasDesdeFin = p.offset;
    const mail = generarEmail(p.paso, { ...ctxBase, diasHastaFin: -diasDesdeFin, diasHastaLimite: 7 - diasDesdeFin });
    assert.ok(mail.asunto.length > 5, `paso ${p.paso} sin asunto`);
    assert.match(mail.texto, /Hola María,/);
    assert.match(mail.html, /Curso APTIS 6 meses/);
    assert.match(mail.html, /offers\/sKLnwNsW/);
    assert.match(mail.html, /97 €/);
    assert.match(mail.html, /Klarna/);
    assert.match(mail.html, /Ya lo he conseguido/);
    assert.match(mail.html, /renewal-aprobado\?t=abc\.def/);
    assert.match(mail.html, /<img src="https:\/\/kajabi-storefronts-production[^"]+" alt="AG Academy"/);
    assert.match(mail.texto, /dejamos de escribirte/);
    assert.match(mail.html, /#FFBD59/);
    assert.match(mail.html, /Poppins/);
    assert.match(mail.texto, /\nJesu\n/);
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

test('curso sin ofertas de renovación: el email pide responder', () => {
  const mail = generarEmail(2, { ...ctxBase, ofertas: ofertasRenovacionDeCurso(buscarCurso('ten-tu-aptis-4m')), diasHastaFin: 3, diasHastaLimite: 10 });
  assert.match(mail.html, /Responde a este email/);
  assert.doesNotMatch(mail.html, /Klarna/);
});

test('cada curso lleva sus renovaciones de pago único', () => {
  assert.deepEqual(ofertasRenovacionDeCurso(buscarCurso('directo')).map((o) => o.precio), ['97', '297', '497']);
  assert.deepEqual(ofertasRenovacionDeCurso(buscarCurso('level-express')).map((o) => o.etiqueta), ['50 días más', '3 meses más']);
  assert.deepEqual(ofertasRenovacionDeCurso(buscarCurso('accelerator')).map((o) => o.precio), ['197']);
});

test('catálogo: detección de cursos y renovaciones por nombre de oferta', () => {
  assert.equal(buscarCursoPorOferta('"DIRECTO AL APTIS EXPRESS" 1 PAGO 647€').key, 'directo-express');
  assert.equal(buscarCursoPorOferta('"DIRECTO AL APTIS" 1 PAGO 747€').key, 'directo');
  assert.equal(buscarCursoPorOferta('"DIRECTO AL APTIS EXPRESS TUTORIZADO" 1').key, 'directo-express-tutorizado');
  assert.equal(buscarCursoPorOferta('Acceso a “Aptis Expert”  12 pagos 77€').key, 'directo');
  assert.equal(buscarCursoPorOferta('Renovación cada 6 meses Acceso a “Aptis Expert”').key, 'directo');
  assert.equal(buscarCursoPorOferta('Aptis Expert Tutorizado 1 pago').key, 'directo-tutorizado');
  assert.equal(buscarCursoPorOferta('Aptis Level - Policía Nacional ').key, 'level');
  assert.equal(buscarCursoPorOferta('Aptis Level  🚀').key, 'level');
  assert.equal(buscarCursoPorOferta('Aptis Level Express').key, 'level-express');
  assert.equal(buscarCursoPorOferta('Ten tu Aptis 1 pago de 397€').key, 'ten-tu-aptis-4m');
  assert.equal(buscarCursoPorOferta('Ten tu Aptis 8 meses').key, 'ten-tu-aptis-8m');
  assert.equal(buscarCursoPorOferta('Aptis Infinity ⭐️'), null);
  assert.equal(buscarCursoPorOferta('Masterclass gratis'), null);
  assert.equal(buscarCurso('directo-tutorizado').meses, 12);
  assert.equal(buscarCurso('Aptis Accelerator').meses, 4);
  assert.deepEqual(duracionCurso(buscarCurso('level-express')), { dias: 50 });
  assert.equal(duracionTexto({ dias: 50 }), '50 días');
  assert.equal(duracionTexto({ meses: 1 }), '1 mes');
  assert.equal(buscarRenovacionPorOferta('Renovacion 6 meses').meses, 6);
  assert.equal(buscarRenovacionPorOferta('Renovación cada 6 meses Acceso a “Aptis Expert”').meses, 6);
  assert.equal(buscarRenovacionPorOferta('Renovación 1 año').meses, 12);
});

test('primerNombre salta iniciales y arregla mayúsculas', () => {
  assert.equal(primerNombre('M. Inmaculada Durillo Perales'), 'Inmaculada');
  assert.equal(primerNombre('Mª Carmen López'), 'Carmen');
  assert.equal(primerNombre('Mª del Carmen López '), 'Carmen');
  assert.equal(primerNombre('M TERESA LEÓN ROJAS'), 'Teresa');
  assert.equal(primerNombre('J. Ismael Ibáñez Cebrián '), 'Ismael');
  assert.equal(primerNombre('Ana Mª Carmona Casado'), 'Ana');
  assert.equal(primerNombre('BELEN REYES GARCIA'), 'Belen');
  assert.equal(primerNombre('ADRIÁN PROTO MORENO'), 'Adrián');
  assert.equal(primerNombre('francisco javier martin'), 'Francisco');
  assert.equal(primerNombre('María López'), 'María');
  assert.equal(primerNombre('JJ Gordon'), '');
  assert.equal(primerNombre('Aa'), '');
  assert.equal(primerNombre('M.'), 'María');
  assert.equal(primerNombre('ana@mail.com'), '');
  assert.equal(primerNombre(''), '');
});

test('sin nombre fiable el saludo es "Hola," a secas', () => {
  const mail = generarEmail(1, { ...ctxBase, nombre: 'Aa', diasHastaFin: 7, diasHastaLimite: 14 });
  assert.match(mail.texto, /^Hola,\n/);
  assert.match(mail.asunto, /^Te quedan 7 días/);
});
