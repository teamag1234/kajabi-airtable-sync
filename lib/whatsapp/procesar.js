import { soloCifras, esDelAgente, enviarTexto } from './callbell.js';
import * as store from './conversaciones.js';
import { responder, MAX_MENSAJES_AGENTE } from './agente.js';

/**
 * Procesa un evento message_created de Callbell.
 *
 * El agente solo habla con quien viene del test de nivel: su primer mensaje
 * lleva la referencia TN… del botón "Quiero mi plan por WhatsApp". A partir de
 * ahí lo reconoce por el teléfono. Se retira en cuanto un closer escribe a mano
 * o cuando él mismo decide pasar la conversación.
 *
 * `deps` permite sustituir Airtable, Callbell y Claude en los tests.
 */
export async function procesarEvento(evento, deps = {}) {
  const d = { store, enviarTexto, responder, esperar, debounceMs: 8000, ...deps };
  const p = evento?.payload;
  if (evento?.event !== 'message_created' || !p || (p.channel && p.channel !== 'whatsapp')) return { accion: 'ignorado' };

  // Lista de teléfonos de prueba: si está definida, el agente solo atiende a esos.
  const permitidos = (process.env.AGENTE_SOLO_TELEFONOS || '').split(',').map(soloCifras).filter(Boolean);

  if (p.status === 'sent') return mensajeSaliente(p, d);
  if (p.status !== 'received') return { accion: 'ignorado' };

  const telefono = soloCifras(p.from);
  if (permitidos.length && !permitidos.includes(telefono)) return { accion: 'fuera de la lista de prueba' };
  const texto = String(p.text || '').trim() || (p.attachments?.length ? '[Ha enviado un audio, imagen o archivo sin texto]' : '');
  const clave = store.claveMensaje(p);
  if (await d.store.mensajeYaGuardado(clave)) return { accion: 'duplicado' };

  // ¿Viene del test? Por la referencia del botón o por el teléfono ya vinculado.
  const ref = store.refEnTexto(texto);
  let lead = ref ? await d.store.leadPorRef(ref) : await d.store.leadPorTelefono(telefono);
  if (!lead) return { accion: 'no viene del test' };
  const f = lead.fields;
  const refLead = f['Ref WhatsApp'];

  if (ref && (!f.Agente || f['Teléfono WhatsApp'] !== telefono)) {
    const cambios = { 'Teléfono WhatsApp': telefono };
    if (!f.Agente) cambios.Agente = store.AGENTE.activo;
    await d.store.actualizarLead(lead.id, cambios);
    lead = { ...lead, fields: { ...f, ...cambios } };
  }

  await d.store.guardarMensaje({ ref: refLead, email: f.Email, telefono, rol: 'Alumno', texto, clave });
  if (lead.fields.Agente !== store.AGENTE.activo) return { accion: 'lo lleva un closer' };

  // Si escribe varios mensajes seguidos, se responde una sola vez al último.
  await d.esperar(d.debounceMs);
  const hist = await d.store.historial(refLead);
  const ultimoAlumno = [...hist].reverse().find((m) => m.rol === 'Alumno');
  if (ultimoAlumno && ultimoAlumno.clave !== clave) return { accion: 'esperando más mensajes' };

  // Un closer puede haber tomado la conversación mientras esperábamos.
  const actual = await d.store.leadPorRef(refLead);
  if (actual?.fields?.Agente !== store.AGENTE.activo) return { accion: 'lo lleva un closer' };

  if (hist.filter((m) => m.rol === 'Agente').length >= MAX_MENSAJES_AGENTE) {
    await d.store.actualizarLead(lead.id, { Agente: store.AGENTE.necesitaCloser, 'Motivo agente': 'Conversación muy larga' });
    return { accion: 'pasado a closer' };
  }

  const r = await d.responder({ lead: actual.fields, historial: hist });
  for (const mensaje of r.mensajes) {
    await d.enviarTexto(telefono, mensaje);
    await d.store.guardarMensaje({ ref: refLead, email: f.Email, telefono, rol: 'Agente', texto: mensaje });
  }
  if (r.pasarACloser) {
    await d.store.actualizarLead(lead.id, { Agente: store.AGENTE.necesitaCloser, 'Motivo agente': r.motivo.slice(0, 300) });
  }
  return { accion: r.pasarACloser ? 'pasado a closer' : 'respondido', mensajes: r.mensajes.length };
}

/** Mensaje que sale de Callbell: si no es del agente, lo ha escrito un closer y el agente se retira. */
async function mensajeSaliente(p, d) {
  if (esDelAgente(p)) return { accion: 'eco del agente' };
  const telefono = soloCifras(p.to);
  const lead = await d.store.leadPorTelefono(telefono);
  if (!lead) return { accion: 'ignorado' };
  const clave = store.claveMensaje(p);
  if (await d.store.mensajeYaGuardado(clave)) return { accion: 'duplicado' };
  await d.store.guardarMensaje({ ref: lead.fields['Ref WhatsApp'], email: lead.fields.Email, telefono, rol: 'Closer', texto: p.text, clave });
  if (lead.fields.Agente === store.AGENTE.activo || lead.fields.Agente === store.AGENTE.necesitaCloser) {
    await d.store.actualizarLead(lead.id, { Agente: store.AGENTE.closer });
  }
  return { accion: 'closer al mando' };
}

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
