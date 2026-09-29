/**
 * Crea en Airtable las tablas del test de nivel ("Test de nivel" y
 * "Conversaciones agente"), o les añade los campos que falten si ya existen
 * (no toca los que ya están).
 *   node scripts/create-level-test-table.mjs
 * Requiere AIRTABLE_TOKEN (con permiso schema.bases:write) y AIRTABLE_BASE_ID.
 * Los nombres salen de AIRTABLE_LEVEL_TEST_TABLE y AIRTABLE_AGENT_TABLE.
 */
import axios from 'axios';
import { CAMPOS_TABLA, TABLA_TEST } from '../lib/level-test/lead.js';
import { CAMPOS_CONVERSACIONES, TABLA_CONVERSACIONES } from '../lib/whatsapp/conversaciones.js';

const url = `https://api.airtable.com/v0/meta/bases/${process.env.AIRTABLE_BASE_ID}/tables`;
const headers = { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` };
const { data } = await axios.get(url, { headers });

async function asegurarTabla(nombre, campos, descripcion) {
  const existente = data.tables.find((t) => t.name === nombre);
  if (!existente) {
    const { data: tabla } = await axios.post(url, { name: nombre, description: descripcion, fields: campos }, { headers });
    console.log(`Tabla "${nombre}" creada (${tabla.id}) con ${tabla.fields.length} campos.`);
    return;
  }
  const tiene = new Set(existente.fields.map((f) => f.name));
  const faltan = campos.filter((c) => !tiene.has(c.name));
  for (const campo of faltan) {
    await axios.post(`${url}/${existente.id}/fields`, campo, { headers });
    console.log(`Campo añadido en "${nombre}": ${campo.name}`);
  }
  console.log(faltan.length ? `Tabla "${nombre}" completada.` : `La tabla "${nombre}" ya tiene todos los campos.`);
}

await asegurarTabla(TABLA_TEST(), CAMPOS_TABLA, 'Leads del test de nivel de agacademyaptis.com/test-nivel');
await asegurarTabla(TABLA_CONVERSACIONES(), CAMPOS_CONVERSACIONES, 'Mensajes del agente de WhatsApp con los leads del test de nivel');
