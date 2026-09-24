/**
 * Crea en Airtable la tabla donde se guardan los leads del test de nivel, o le
 * añade los campos que le falten si ya existe (no toca los que ya están).
 *   node scripts/create-level-test-table.mjs
 * Requiere AIRTABLE_TOKEN (con permiso schema.bases:write) y AIRTABLE_BASE_ID.
 * El nombre sale de AIRTABLE_LEVEL_TEST_TABLE (por defecto "Test de nivel").
 */
import axios from 'axios';
import { CAMPOS_TABLA, TABLA_TEST } from '../lib/level-test/lead.js';

const nombre = TABLA_TEST();
const url = `https://api.airtable.com/v0/meta/bases/${process.env.AIRTABLE_BASE_ID}/tables`;
const headers = { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` };

const { data } = await axios.get(url, { headers });
const existente = data.tables.find((t) => t.name === nombre);

if (!existente) {
  const { data: tabla } = await axios.post(url, {
    name: nombre,
    description: 'Leads del test de nivel de agacademyaptis.com/test-nivel',
    fields: CAMPOS_TABLA,
  }, { headers });
  console.log(`Tabla "${nombre}" creada (${tabla.id}) con ${tabla.fields.length} campos.`);
} else {
  const tiene = new Set(existente.fields.map((f) => f.name));
  const faltan = CAMPOS_TABLA.filter((c) => !tiene.has(c.name));
  for (const campo of faltan) {
    await axios.post(`${url}/${existente.id}/fields`, campo, { headers });
    console.log(`Campo añadido: ${campo.name}`);
  }
  console.log(faltan.length ? `Tabla "${nombre}" completada.` : `La tabla "${nombre}" ya tiene todos los campos.`);
}
