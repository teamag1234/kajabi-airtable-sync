import axios from 'axios';

const KAJABI_API_BASE = 'https://api.kajabi.com/v1';

export async function getKajabiPayments(daysBack = 1) {
  try {
    const apiKey = process.env.KAJABI_API_KEY;
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    const sinceISO = since.toISOString().split('T')[0];

    const response = await axios.get(`${KAJABI_API_BASE}/payments`, {
      headers,
      params: {
        'filter[created_at_min]': sinceISO,
        'limit': 250,
      },
    });

    return response.data.payments || [];
  } catch (error) {
    console.error('Error fetching Kajabi payments:', error.message);
    throw error;
  }
}

export async function getKajabiCustomer(customerId) {
  try {
    const apiKey = process.env.KAJABI_API_KEY;
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.get(`${KAJABI_API_BASE}/customers/${customerId}`, {
      headers,
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching Kajabi customer ${customerId}:`, error.message);
    throw error;
  }
}

export async function getKajabiOrders(customerId) {
  try {
    const apiKey = process.env.KAJABI_API_KEY;
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.get(`${KAJABI_API_BASE}/customers/${customerId}/orders`, {
      headers,
    });

    return response.data.orders || [];
  } catch (error) {
    console.error(`Error fetching Kajabi orders for customer ${customerId}:`, error.message);
    throw error;
  }
}
