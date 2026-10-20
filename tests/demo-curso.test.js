import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEMO_MODULOS, DEMO_LECCIONES, leccionDemo, contarPalabras } from '../lib/demo-curso/contenido.js';
import { filaDesdeAlta, filaDesdeProgreso, filaDesdeClicDemo, filaDesdeWhatsAppDemo, CAMPOS_TABLA_DEMO } from '../lib/demo-curso/lead.js';
import { construir } from '../scripts/build-demo-curso.mjs';

const TIPOS = ['intro', 'test', 'ordenar', 'writing', 'speaking'];

test('el temario de la demo está completo y bien formado', () => {
  assert.equal(DEMO_LECCIONES.length, 5);
  assert.equal(new Set(DEMO_LECCIONES.map((l) => l.id)).size, DEMO_LECCIONES.length);
  for (const l of DEMO_LECCIONES) {
    assert.ok(TIPOS.includes(l.tipo), l.id);
    assert.ok(l.titulo && l.duracion, l.id);
    assert.equal(leccionDemo(l.id), l);
  }
  for (const p of leccionDemo('grammar-trampas').preguntas) assert.ok(p.opciones[p.correcta] && p.truco, p.enunciado);
  const ordenar = leccionDemo('reading-ordenar');
  assert.ok(ordenar.primera && ordenar.frases.length >= 3);
  for (const m of DEMO_MODULOS.filter((x) => x.bloqueado)) assert.ok(m.lecciones.every((l) => typeof l === 'string'), m.titulo);
});

test('el email modelo del Writing cumple las palabras que pide la tarea', () => {
  const w = leccionDemo('writing-email-formal');
  const n = contarPalabras(w.modelo);
  assert.ok(n >= w.minimo && n <= w.maximo, `${n} palabras`);
  assert.equal(contarPalabras('  '), 0);
});

test('fila de alta con progreso, atribución y solo campos de la tabla', () => {
  const f = filaDesdeAlta({
    email: ' Ana@Mail.com ', nombre: 'Ana', telefono: '+34 612 34 56 78',
    hechas: ['aptis-por-dentro', 'grammar-trampas', 'inventada'], leccion: 'grammar-trampas',
    atribucion: { gclid: 'abc', utm_source: 'google' },
  }, new Date('2026-10-20T10:00:00Z'));
  assert.equal(f.email, 'ana@mail.com');
  assert.equal(f.fields['Teléfono'], '+34612345678');
  assert.equal(f.fields['Lecciones hechas'], 2);
  assert.equal(f.fields['Última lección'], '5 trampas de Grammar que caen siempre');
  assert.equal(f.fields['Demo completada'], undefined);
  assert.equal(f.fields.GCLID, 'abc');
  const campos = new Set(CAMPOS_TABLA_DEMO.map((c) => c.name));
  const todas = filaDesdeProgreso({ email: 'a@b.es', hechas: DEMO_LECCIONES.map((l) => l.id), leccion: 'speaking-part-1' });
  assert.equal(todas.fields['Demo completada'], true);
  for (const fila of [f, todas, filaDesdeClicDemo({ email: 'a@b.es', curso: 'express' }), filaDesdeWhatsAppDemo({ email: 'a@b.es' })]) {
    for (const k of Object.keys(fila.fields)) assert.ok(campos.has(k), k);
  }
});

test('rechaza emails no válidos y cursos inventados', () => {
  assert.ok(filaDesdeAlta({ email: 'nope' }).error);
  assert.ok(filaDesdeProgreso({ email: '' }).error);
  assert.ok(filaDesdeClicDemo({ email: 'a@b.es', curso: 'otro' }).error);
  assert.ok(filaDesdeWhatsAppDemo({ email: 'x' }).error);
});

test('kajabi/demo-curso.html está al día (npm run build:demo-curso)', () => {
  const html = construir();
  assert.equal(readFileSync(new URL('../kajabi/demo-curso.html', import.meta.url), 'utf8'), html);
  assert.ok(!html.includes('/*__'), 'quedan marcadores sin sustituir');
  assert.ok(!/^export /m.test(html), 'queda algún export');
  assert.match(html, /#ag-demo \.ag-demo-btn \{/);
});
