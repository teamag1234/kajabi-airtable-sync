import axios from 'axios';

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

const headers = () => ({
  'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
  'Content-Type': 'application/json',
});

export async function createOrUpdateRecord(tableName, fields, filterByFormula) {
  try {
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (filterByFormula) {
      const existing = await getRecords(tableName, filterByFormula);
      if (existing.length > 0) {
        return updateRecord(tableName, existing[0].id, fields);
      }
    }

    const response = await axios.post(
      `${AIRTABLE_API_BASE}/${baseId}/${tableName}`,
      {
        records: [
          {
            fields,
          },
        ],
      },
      { headers: headers() }
    );

    return response.data.records[0];
  } catch (error) {
    console.error('Error creating/updating Airtable record:', error.message);
    throw error;
  }
}

export async function getRecords(tableName, filterByFormula = null) {
  try {
    const baseId = process.env.AIRTABLE_BASE_ID;
    const params = {};

    if (filterByFormula) {
      params.filterByFormula = filterByFormula;
    }

    const response = await axios.get(
      `${AIRTABLE_API_BASE}/${baseId}/${tableName}`,
      {
        headers: headers(),
        params,
      }
    );

    return response.data.records || [];
  } catch (error) {
    console.error('Error fetching Airtable records:', error.message);
    throw error;
  }
}

export async function updateRecord(tableName, recordId, fields) {
  try {
    const baseId = process.env.AIRTABLE_BASE_ID;

    const response = await axios.patch(
      `${AIRTABLE_API_BASE}/${baseId}/${tableName}/${recordId}`,
      {
        fields,
      },
      { headers: headers() }
    );

    return response.data;
  } catch (error) {
    console.error(`Error updating Airtable record ${recordId}:`, error.message);
    throw error;
  }
}

export async function getRecordsByEmail(tableName, email) {
  const filterFormula = `{Email} = "${email}"`;
  return getRecords(tableName, filterFormula);
}
