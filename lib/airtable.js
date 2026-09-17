import axios from 'axios';

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

const headers = () => ({
  'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
  'Content-Type': 'application/json',
});

/** Escapa comillas para usar un valor dentro de una fórmula de filtro. */
export function escapeFormulaValue(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function createRecord(tableName, fields, { typecast = false } = {}) {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const response = await axios.post(
    `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableName)}`,
    { records: [{ fields }], typecast },
    { headers: headers() }
  );
  return response.data.records[0];
}

export async function createOrUpdateRecord(tableName, fields, filterByFormula, options = {}) {
  try {
    if (filterByFormula) {
      const existing = await getRecords(tableName, filterByFormula, { maxRecords: 1 });
      if (existing.length > 0) {
        return updateRecord(tableName, existing[0].id, fields, options);
      }
    }
    return await createRecord(tableName, fields, options);
  } catch (error) {
    console.error('Error creating/updating Airtable record:', error.message);
    throw error;
  }
}

/**
 * Devuelve todos los registros que cumplen el filtro, siguiendo la paginación
 * de Airtable (100 por página) hasta el final o hasta maxRecords.
 */
export async function getRecords(tableName, filterByFormula = null, { maxRecords = null, fields = null } = {}) {
  try {
    const baseId = process.env.AIRTABLE_BASE_ID;
    const records = [];
    let offset = null;

    do {
      const params = { pageSize: 100 };
      if (filterByFormula) params.filterByFormula = filterByFormula;
      if (maxRecords) params.maxRecords = maxRecords;
      if (fields) params.fields = fields;
      if (offset) params.offset = offset;

      const response = await axios.get(
        `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableName)}`,
        { headers: headers(), params }
      );

      records.push(...(response.data.records || []));
      offset = response.data.offset || null;
      if (maxRecords && records.length >= maxRecords) break;
    } while (offset);

    return records;
  } catch (error) {
    console.error('Error fetching Airtable records:', error.message);
    throw error;
  }
}

export async function updateRecord(tableName, recordId, fields, { typecast = false } = {}) {
  try {
    const baseId = process.env.AIRTABLE_BASE_ID;
    const response = await axios.patch(
      `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableName)}/${recordId}`,
      { fields, typecast },
      { headers: headers() }
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating Airtable record ${recordId}:`, error.message);
    throw error;
  }
}

export async function getRecordsByEmail(tableName, email) {
  const filterFormula = `{Email} = "${escapeFormulaValue(email)}"`;
  return getRecords(tableName, filterFormula);
}
