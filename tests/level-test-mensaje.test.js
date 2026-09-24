import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mensajeCloser, enlaceWhatsApp, numeroWhatsApp, respondioDeprisa } from '../lib/level-test/mensaje.js';
import { filaConMensaje, CAMPOS_TABLA } from '../lib/level-test/lead.js';
import { PREGUNTAS } from '../lib/level-test/quiz.js';

const miriam = {
  Nombre: 'miriam', 'Teléfono': '612345678', Nivel: 'A1', 'Nivel que necesita': 'C1',
  'Para qué': 'Oposiciones docentes', 'Cuándo se examina': 'En 3-6 meses',
  Respuestas: 'CBCBBABBBAAAAAAAAAABBBBBAFHAE', 'Clic oferta': 'Directo a tu Certificado Tutorizado',
};

test('detecta respuestas a la carrera', () => {
  assert.equal(respondioDeprisa(miriam.Respuestas), true);
  // La plantilla de respuestas correctas no tiene 6 letras iguales seguidas
  assert.equal(respondioDeprisa(PREGUNTAS.map((p) => 'ABCDEFGHIJ'[p.correcta]).join('')), false);
});

test('mensaje para quien contestó deprisa y miró una oferta', () => {
  const m = mensajeCloser(miriam);
  assert.match(m, /^Hola Miriam! Te escribo de AG Academy/);
  assert.match(m, /a la carrera/);
  assert.match(m, /Vi que le echaste un ojo al Directo a tu Certificado Tutorizado/);
  assert.match(m, /Me dices que te piden C1 para las oposiciones\. ¿Te cuento en un audio/);
});

test('el mensaje cambia según el nivel frente al que le piden', () => {
  const base = { Nombre: 'Ana', Respuestas: 'BCABBCCBC', 'Cuándo se examina': 'En 1-3 meses' };
  assert.match(mensajeCloser({ ...base, Nivel: 'B1', 'Nivel que necesita': 'B1' }), /justo lo que te piden/);
  assert.match(mensajeCloser({ ...base, Nivel: 'B2', 'Nivel que necesita': 'B1' }), /más del B1 que te piden/);
  assert.match(mensajeCloser({ ...base, Nivel: 'A2', 'Nivel que necesita': 'B1' }), /Estás a un paso/);
  assert.match(mensajeCloser({ ...base, Nivel: 'A1', 'Nivel que necesita': 'B2' }), /Hay camino por delante/);
  assert.match(mensajeCloser({ ...base, Nivel: 'A2', 'Nivel que necesita': 'Aún no lo sé' }), /^Hola Ana![\s\S]*Te ha salido A2\. Con eso/);
  assert.doesNotMatch(mensajeCloser({ ...base, Nivel: 'A2' }), /Vi que/);
});

test('enlace de WhatsApp con el número normalizado y el texto', () => {
  assert.equal(numeroWhatsApp('612345678'), '34612345678');
  assert.equal(numeroWhatsApp('+34 612 34 56 78'), '34612345678');
  assert.equal(numeroWhatsApp('0033612345678'), '33612345678');
  assert.equal(numeroWhatsApp('123'), '');
  const url = enlaceWhatsApp(miriam);
  assert.ok(url.startsWith('https://wa.me/34612345678?text=Hola%20Miriam'));
  assert.equal(decodeURIComponent(url.split('text=')[1]), mensajeCloser(miriam));
  assert.equal(enlaceWhatsApp({ ...miriam, 'Teléfono': '' }), '');
});

test('la fila del test lleva el mensaje y sus campos existen en la tabla', () => {
  const f = filaConMensaje({ email: 'a@b.es', nombre: 'Ana', telefono: '612345678', perfil: { necesita: 'B1' }, respuestas: [] });
  assert.match(f.fields['Mensaje WhatsApp'], /Te ha salido A1 y te piden B1/);
  assert.ok(f.fields['Enviar WhatsApp'].startsWith('https://wa.me/34612345678'));
  const campos = new Set(CAMPOS_TABLA.map((c) => c.name));
  for (const k of Object.keys(f.fields)) assert.ok(campos.has(k), k);
});
