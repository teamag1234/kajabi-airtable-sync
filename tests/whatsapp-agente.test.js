import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { firmaValida, esDelAgente } from '../lib/whatsapp/callbell.js';
import { refEnTexto, claveMensaje, AGENTE } from '../lib/whatsapp/conversaciones.js';
import { mensajesParaClaude, contextoLead, instrucciones } from '../lib/whatsapp/agente.js';
import { procesarEvento } from '../lib/whatsapp/procesar.js';
import { referenciaLead } from '../lib/level-test/quiz.js';

const REF = referenciaLead('ana@mail.com');

/** Airtable, Callbell y Claude en memoria. */
function simulado({ agente = '', telefonoVinculado = '', respuesta } = {}) {
  const lead = { id: 'rec1', fields: { Email: 'ana@mail.com', Nombre: 'Ana', Nivel: 'A2', 'Ref WhatsApp': REF, Agente: agente, 'Teléfono WhatsApp': telefonoVinculado } };
  const filas = [];
  const enviados = [];
  const llamadas = [];
  const store = {
    mensajeYaGuardado: async (clave) => filas.some((f) => f.clave === clave),
    leadPorRef: async (ref) => (ref === REF ? lead : null),
    leadPorTelefono: async (tel) => (lead.fields.Agente && lead.fields['Teléfono WhatsApp'] === tel ? lead : null),
    actualizarLead: async (id, campos) => { Object.assign(lead.fields, campos); },
    guardarMensaje: async (m) => { filas.push({ ...m, clave: m.clave || `a${filas.length}`, fecha: new Date(Date.now() + filas.length).toISOString() }); },
    historial: async () => filas.map((f) => ({ rol: f.rol, texto: f.texto, clave: f.clave, fecha: f.fecha })),
  };
  const deps = {
    store,
    esperar: async () => {},
    enviarTexto: async (tel, texto) => { enviados.push({ tel, texto }); },
    responder: async (args) => { llamadas.push(args); return respuesta || { mensajes: ['Hola Ana, soy el asistente de AG Academy'], pasarACloser: false, motivo: '' }; },
  };
  return { lead, filas, enviados, llamadas, deps };
}

const recibido = (text, extra = {}) => ({
  event: 'message_created',
  payload: { from: '34612345678', to: '34601926127', text, status: 'received', channel: 'whatsapp', createdAt: new Date().toISOString(), contact: { uuid: 'c1' }, ...extra },
});

test('firma de Callbell', () => {
  const secreto = 'whsec_x';
  const cuerpo = '{"event":"message_created"}';
  const t = 1790000000;
  const v1 = crypto.createHmac('sha256', secreto).update(`${t}.${cuerpo}`).digest('hex');
  assert.equal(firmaValida(cuerpo, `t=${t},v1=${v1}`, secreto, t * 1000), true);
  assert.equal(firmaValida(cuerpo, `t=${t},v1=${v1}`, secreto, (t + 600) * 1000), false);
  assert.equal(firmaValida(cuerpo + ' ', `t=${t},v1=${v1}`, secreto, t * 1000), false);
  assert.equal(firmaValida(cuerpo, '', ''), true); // sin secreto no se exige
  assert.equal(esDelAgente({ metadata: { agente: 'test-nivel' } }), true);
  assert.equal(esDelAgente({ metadata: '{"agente":"test-nivel"}' }), true);
  assert.equal(esDelAgente({}), false);
});

test('encuentra la referencia del botón en el texto', () => {
  assert.equal(refEnTexto(`Hola! Soy Ana. Quiero mi plan personalizado 🙌 (ref ${REF})`), REF);
  assert.equal(refEnTexto('Hola, info del curso'), null);
});

test('el primer mensaje con referencia activa al agente y le responde', async () => {
  const s = simulado();
  const r = await procesarEvento(recibido(`Quiero mi plan (ref ${REF})`), s.deps);
  assert.equal(r.accion, 'respondido');
  assert.equal(s.lead.fields.Agente, AGENTE.activo);
  assert.equal(s.lead.fields['Teléfono WhatsApp'], '34612345678');
  assert.deepEqual(s.enviados, [{ tel: '34612345678', texto: 'Hola Ana, soy el asistente de AG Academy' }]);
  assert.deepEqual(s.filas.map((f) => f.rol), ['Alumno', 'Agente']);
});

test('ignora a quien no viene del test', async () => {
  const s = simulado();
  const r = await procesarEvento(recibido('Hola, quiero info'), s.deps);
  assert.equal(r.accion, 'no viene del test');
  assert.equal(s.enviados.length, 0);
  assert.equal(s.filas.length, 0);
});

test('sigue la conversación por teléfono y no repite mensajes reintentados', async () => {
  const s = simulado({ agente: AGENTE.activo, telefonoVinculado: '34612345678' });
  const ev = recibido('Tengo 5 horas a la semana');
  assert.equal((await procesarEvento(ev, s.deps)).accion, 'respondido');
  assert.equal((await procesarEvento(ev, s.deps)).accion, 'duplicado');
  assert.equal(s.enviados.length, 1);
});

test('si escribe varios mensajes seguidos solo responde al último', async () => {
  const s = simulado({ agente: AGENTE.activo, telefonoVinculado: '34612345678' });
  const primero = recibido('Hola', { createdAt: '2026-09-29T10:00:00Z' });
  const segundo = recibido('Tengo una duda', { createdAt: '2026-09-29T10:00:02Z' });
  // El segundo llega mientras el primero espera
  s.deps.esperar = async () => { s.deps.esperar = async () => {}; await procesarEvento(segundo, s.deps); };
  const r = await procesarEvento(primero, s.deps);
  assert.equal(r.accion, 'esperando más mensajes');
  assert.equal(s.enviados.length, 1);
});

test('cuando escribe un closer, el agente se retira', async () => {
  const s = simulado({ agente: AGENTE.activo, telefonoVinculado: '34612345678' });
  const saliente = { event: 'message_created', payload: { from: '34601926127', to: '34612345678', text: 'Hola Ana, soy Laura', status: 'sent', channel: 'whatsapp', createdAt: 'x' } };
  assert.equal((await procesarEvento(saliente, s.deps)).accion, 'closer al mando');
  assert.equal(s.lead.fields.Agente, AGENTE.closer);
  assert.equal((await procesarEvento(recibido('Gracias Laura'), s.deps)).accion, 'lo lleva un closer');
  assert.equal(s.enviados.length, 0);
  // Los mensajes del propio agente no cuentan como closer
  const s2 = simulado({ agente: AGENTE.activo, telefonoVinculado: '34612345678' });
  assert.equal((await procesarEvento({ event: 'message_created', payload: { ...saliente.payload, metadata: { agente: 'test-nivel' } } }, s2.deps)).accion, 'eco del agente');
  assert.equal(s2.lead.fields.Agente, AGENTE.activo);
});

test('si el agente se atasca, pasa la conversación a un closer', async () => {
  const s = simulado({ agente: AGENTE.activo, telefonoVinculado: '34612345678', respuesta: { mensajes: ['Te escribe un compañero en cuanto pueda'], pasarACloser: true, motivo: 'Problema con un pago' } });
  const r = await procesarEvento(recibido('Me han cobrado dos veces'), s.deps);
  assert.equal(r.accion, 'pasado a closer');
  assert.equal(s.lead.fields.Agente, AGENTE.necesitaCloser);
  assert.equal(s.lead.fields['Motivo agente'], 'Problema con un pago');
});

test('lista de teléfonos de prueba', async () => {
  process.env.AGENTE_SOLO_TELEFONOS = '600000000';
  try {
    const s = simulado();
    assert.equal((await procesarEvento(recibido(`ref ${REF}`), s.deps)).accion, 'fuera de la lista de prueba');
  } finally {
    delete process.env.AGENTE_SOLO_TELEFONOS;
  }
});

test('historial para Claude: alterna roles, marca a los closers y empieza por el alumno', () => {
  const m = mensajesParaClaude([
    { rol: 'Agente', texto: 'eco suelto' },
    { rol: 'Alumno', texto: 'Hola' },
    { rol: 'Alumno', texto: 'Quiero mi plan' },
    { rol: 'Agente', texto: 'Te cuento' },
    { rol: 'Closer', texto: 'Soy Laura' },
    { rol: 'Alumno', texto: 'Vale' },
  ]);
  assert.deepEqual(m.map((x) => x.role), ['user', 'assistant', 'user']);
  assert.equal(m[0].content, 'Hola\n\nQuiero mi plan');
  assert.match(m[1].content, /Te cuento\n\n\[Mensaje de un compañero del equipo\] Soy Laura/);
  assert.equal(claveMensaje(recibido('a').payload).length, 20);
});

test('las instrucciones llevan los enlaces con el cupón y el contexto los datos del test', () => {
  const i = instrucciones();
  assert.match(i, /offers\/aLwrqozM\/checkout\?coupon_code=TEST300/);
  assert.match(i, /asistente de AG Academy/);
  const c = contextoLead({ Nombre: 'Ana', Nivel: 'A2', Nota: 5.3, Aciertos: 18, Writing: '5/9', 'Nivel que necesita': 'B1' });
  assert.match(c, /Nivel que le ha salido: A2 \(nota 5,3\/10, 18 de 34 aciertos\)/);
  assert.match(c, /Writing 5\/9/);
});
