import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PREGUNTAS, corregir, nivelDesdePorcentaje, recomendarCurso, CURSOS_TEST } from '../lib/level-test/quiz.js';
import { filaDesdeTest, filaDesdeClic, CAMPOS_TABLA } from '../lib/level-test/lead.js';
import { construir, conImportant } from '../scripts/build-test-nivel.mjs';

const todasBien = () => PREGUNTAS.map((p) => p.correcta);
const conAciertos = (n) => PREGUNTAS.map((p, i) => (i < n ? p.correcta : (p.correcta + 1) % p.opciones.length));

test('hay 34 preguntas puntuables y cada respuesta correcta existe', () => {
  assert.equal(PREGUNTAS.length, 34);
  for (const p of PREGUNTAS) assert.ok(p.opciones[p.correcta], p.enunciado);
});

test('el 100% es B2 con un 10', () => {
  const r = corregir(todasBien());
  assert.equal(r.aciertos, 34);
  assert.equal(r.nota, 10);
  assert.equal(r.nivel, 'B2');
  assert.deepEqual(r.porSeccion.reading, { aciertos: 5, total: 5 });
});

test('niveles por tramos de porcentaje', () => {
  assert.equal(nivelDesdePorcentaje(0), 'A1');
  assert.equal(nivelDesdePorcentaje(29), 'A1');
  assert.equal(nivelDesdePorcentaje(30), 'A2');
  assert.equal(nivelDesdePorcentaje(54), 'A2');
  assert.equal(nivelDesdePorcentaje(55), 'B1');
  assert.equal(nivelDesdePorcentaje(84), 'B1');
  assert.equal(nivelDesdePorcentaje(85), 'B2');
  assert.equal(corregir(conAciertos(22)).nivel, 'B1'); // 65 %
  assert.equal(corregir([]).nivel, 'A1');
});

test('recomendación según salto de nivel y tiempo', () => {
  assert.equal(recomendarCurso({ necesita: 'B1', cuando: '3-6-meses' }, 'B1').curso, 'level');
  assert.equal(recomendarCurso({ necesita: 'B1', cuando: '1-3-meses' }, 'A2').curso, 'level');
  assert.equal(recomendarCurso({ necesita: 'B1', cuando: 'menos-1-mes' }, 'A2').curso, 'express');
  assert.equal(recomendarCurso({ necesita: 'B1', cuando: '1-3-meses' }, 'A1').curso, 'tutorizado');
  assert.equal(recomendarCurso({ necesita: 'B1', cuando: 'sin-fecha' }, 'A1').curso, 'express');
  // Level no llega a B2: para B2/C1 siempre Directo
  assert.equal(recomendarCurso({ necesita: 'B2', cuando: '3-6-meses' }, 'B1').curso, 'express');
  assert.equal(recomendarCurso({ necesita: 'B2', cuando: '3-6-meses' }, 'B2').curso, 'express');
  assert.equal(recomendarCurso({ necesita: 'B2', cuando: 'menos-1-mes' }, 'B1').curso, 'tutorizado');
  assert.equal(recomendarCurso({ necesita: 'C1', cuando: '3-6-meses' }, 'A2').curso, 'tutorizado');
  // Sin saber el nivel que le piden se asume B1
  assert.equal(recomendarCurso({ necesita: 'no-se' }, 'A2').nivelObjetivo, 'B1');
  for (const curso of ['level', 'express', 'tutorizado']) assert.ok(CURSOS_TEST[curso].url.includes('/offers/'));
});

test('la fila de Airtable recalcula la nota en servidor', () => {
  const f = filaDesdeTest({
    email: ' Ana@Mail.com ', nombre: 'Ana', telefono: '+34 612 34 56 78',
    perfil: { para: 'policia', necesita: 'A2', cuando: '1-3-meses' },
    respuestas: todasBien(), nivel: 'A1', // lo que diga el navegador da igual
    atribucion: { gclid: 'abc', utm_source: 'google' },
  }, new Date('2026-09-24T10:00:00Z'));
  assert.equal(f.email, 'ana@mail.com');
  assert.equal(f.fields.Nivel, 'B2');
  assert.equal(f.fields.Nota, 10);
  assert.equal(f.fields.Porcentaje, 1);
  assert.equal(f.fields['Teléfono'], '+34612345678');
  assert.equal(f.fields['Para qué'], 'Policía Nacional');
  assert.equal(f.fields['Curso recomendado'], 'APTIS Level');
  assert.equal(f.fields.GCLID, 'abc');
  assert.equal(f.fields.Respuestas.length, 34);
  // Todos los campos que se escriben existen en la tabla
  const campos = new Set(CAMPOS_TABLA.map((c) => c.name));
  for (const k of Object.keys(f.fields)) assert.ok(campos.has(k), k);
  for (const k of Object.keys(filaDesdeClic({ email: 'a@b.es', curso: 'level' }).fields)) assert.ok(campos.has(k), k);
});

test('rechaza email no válido y cursos inventados', () => {
  assert.ok(filaDesdeTest({ email: 'nope' }).error);
  assert.ok(filaDesdeClic({ email: 'a@b.es', curso: 'otro' }).error);
});

test('conImportant marca las declaraciones, acota a #ag-tn y respeta @keyframes', () => {
  const css = conImportant('.ag-tn { color: red; }\n.ag-tn-x:hover, .ag-tn p { top: 0 }\n@keyframes k { from { opacity: 0; } }\n@media (max-width: 5px) { .ag-tn-y { left: 1px; } }');
  assert.match(css, /#ag-tn \{ color: red !important; \}/);
  assert.match(css, /#ag-tn \.ag-tn-x:hover, #ag-tn p \{ top: 0 !important\}/);
  assert.match(css, /@keyframes k \{ from \{ opacity: 0; \} \}/);
  assert.match(css, /@media \(max-width: 5px\) \{ #ag-tn \.ag-tn-y \{ left: 1px !important; \} \}/);
});

test('kajabi/test-nivel.html está al día (npm run build:test-nivel)', () => {
  assert.equal(readFileSync(new URL('../kajabi/test-nivel.html', import.meta.url), 'utf8'), construir());
});
