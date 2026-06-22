'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const manualSync = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sync-kajabi');
      const data = await response.json();
      setSyncStatus(data);
      setLastSync(new Date());
    } catch (error) {
      setSyncStatus({ error: error.message });
    }
    setLoading(false);
  };

  const checkPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/check-failed-payments');
      const data = await response.json();
      setSyncStatus(data);
    } catch (error) {
      setSyncStatus({ error: error.message });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetch('/api/health').catch(console.error);
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔄 Kajabi-Airtable Sync</h1>
      <p>Sistema automático de sincronización de pagos</p>

      <div style={{
        border: '1px solid #ccc',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        backgroundColor: '#f9f9f9'
      }}>
        <h2>Control Manual</h2>
        <button
          onClick={manualSync}
          disabled={loading}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Sincronizando...' : '▶️ Sincronizar Ahora'}
        </button>

        <button
          onClick={checkPayments}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Verificando...' : '⚠️ Verificar Pagos Fallidos'}
        </button>
      </div>

      {lastSync && (
        <p style={{ color: '#666', fontSize: '14px' }}>
          Última sincronización: {lastSync.toLocaleString('es-ES')}
        </p>
      )}

      {syncStatus && (
        <div style={{
          border: '1px solid #ddd',
          padding: '20px',
          borderRadius: '8px',
          backgroundColor: syncStatus.success ? '#dcfce7' : '#fee2e2',
          marginTop: '20px'
        }}>
          <h3>{syncStatus.success ? '✅ Éxito' : '❌ Error'}</h3>
          <pre style={{
            backgroundColor: '#f3f4f6',
            padding: '10px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {JSON.stringify(syncStatus, null, 2)}
          </pre>
        </div>
      )}

      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#f0f9ff',
        borderRadius: '8px',
        borderLeft: '4px solid #2563eb'
      }}>
        <h3>📋 Información del Sistema</h3>
        <ul>
          <li><strong>Sincronización automática:</strong> Cada día a las 2:00 AM</li>
          <li><strong>Verificación de pagos:</strong> Cada día a las 10:00 AM</li>
          <li><strong>Recordatorios:</strong> Se envían por email después de 3 días sin pago</li>
          <li><strong>Datos sincronizados:</strong> Nombre, email, teléfono, importe, mes, estado, número de cuota</li>
        </ul>
      </div>
    </div>
  );
}
