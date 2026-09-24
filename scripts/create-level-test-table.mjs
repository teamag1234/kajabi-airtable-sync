/**
 * Crea en Airtable la tabla donde se guardan los leads del test de nivel.
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
if (data.tables.some((t) => t.name === nombre)) {
  console.log(`La tabla "${nombre}" ya existe. No hago nada.`);
  process.exit(0);
}

const { data: tabla } = await axios.post(url, {
  name: nombre,
  description: 'Leads del test de nivel de agacademyaptis.com/test-nivel',
  fields: CAMPOS_TABLA,
}, { headers });
console.log(`Tabla "${nombre}" creada (${tabla.id}) con ${tabla.fields.length} campos.`);
