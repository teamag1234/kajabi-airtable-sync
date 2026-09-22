'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [renewals, setRenewals] = useState(null);
  const [secret, setSecret] = useState('');

  // El secreto (CRON_SECRET) se guarda solo en este navegador
  const authHeaders = () => (secret ? { Authorization: `Bearer ${secret}` } : {});
  const saveSecret = (value) => {
    setSecret(value);
    try { localStorage.setItem('ag_cron_secret', value); } catch {}
  };

  const loadRenewals = async () => {
    try {
      const response = await fetch('/api/renewal-summary', { headers: authHeaders() });
      const data = await response.json();
      setRenewals(data.success ? data.data : { error: data.error });
    } catch (error) {
      setRenewals({ error: error.message });
    }
  };

  const runRenewals = async (dry) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/renewal-sequence${dry ? '?dry=1' : ''}`, { headers: authHeaders() });
      const data = await response.json();
      setSyncStatus(data);
      if (!dry) loadRenewals();
    } catch (error) {
      setSyncStatus({ error: error.message });
    }
    setLoading(false);
  };

  const manualSync = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sync-kajabi', { headers: authHeaders() });
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
      const response = await fetch('/api/check-failed-payments', { headers: authHeaders() });
      const data = await response.json();
      setSyncStatus(data);
    } catch (error) {
      setSyncStatus({ error: error.message });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetch('/api/health').catch(console.error);
    try { setSecret(localStorage.getItem('ag_cron_secret') || ''); } catch {}
  }, []);

  useEffect(() => {
    loadRenewals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔄 Kajabi-Airtable Sync</h1>
      <p>Sistema automático de sincronización de pagos</p>

      <div style={{
        border: '1px solid #ccc',
        padding: '16px 20px',
        borderRadius: '8px',
        marginBottom: '20px',
        backgroundColor: '#fffbeb'
      }}>
        <label htmlFor="ag-secret" style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>🔑 Clave de acceso (CRON_SECRET)</label>
        <input
          id="ag-secret"
          type="password"
          value={secret}
          onChange={(e) => saveSecret(e.target.value)}
          placeholder="Pega aquí la clave. Se guarda solo en este navegador."
          style={{ width: '100%', maxWidth: '520px', padding: '8px 10px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'monospace' }}
        />
        <p style={{ fontSize: '13px', color: '#666', margin: '6px 0 0 0' }}>
          {secret ? 'Clave guardada. Los botones ya funcionan.' : 'Sin clave, los botones devolverán "Unauthorized".'}
        </p>
      </div>

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

      <div style={{
        border: '1px solid #ccc',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        backgroundColor: '#0a0e27',
        color: 'white'
      }}>
        <h2 style={{ color: '#FFBD59', marginTop: 0 }}>Renovaciones</h2>
        <p style={{ fontSize: '14px', opacity: 0.85 }}>
          Secuencia automática de renovación: 7 emails entre 7 días antes y 7 días después del fin de acceso. Cron diario a las 9:00 (hora peninsular).
        </p>

        {renewals && !renewals.error && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', margin: '16px 0' }}>
            {[
              ['Total', renewals.total],
              ['Activos', renewals.activos],
              ['En secuencia', renewals.enSecuencia],
              ['Ventana abierta', renewals.ventanaAbierta],
              ['Cerrados', renewals.cerrados],
              ['Aprobados', renewals.aprobados],
              ['Pausados', renewals.pausados],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 14px', minWidth: '110px' }}>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#FFBD59' }}>{value}</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>{label}</div>
              </div>
            ))}
          </div>
        )}
        {renewals && renewals.error && (
          <p style={{ color: '#fca5a5', fontSize: '14px' }}>No se pudo cargar el resumen: {renewals.error}{renewals.error === 'Unauthorized' ? ' (pega la clave de acceso arriba)' : ''}</p>
        )}

        <button
          onClick={() => runRenewals(true)}
          disabled={loading}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: 'transparent',
            color: '#FFBD59',
            border: '1px solid #FFBD59',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Calculando...' : '👁 Simular (sin enviar)'}
        </button>
        <button
          onClick={() => runRenewals(false)}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#FFBD59',
            color: '#0a0e27',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Enviando...' : '📧 Lanzar secuencia de hoy'}
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
          <h3>{syncStatus.success ? '✅ Éxito' : '❌ Error'}{syncStatus.data && syncStatus.data.modoPrueba ? ` · modo prueba (emails a ${syncStatus.data.testTo})` : ''}</h3>
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
          <li><strong>Renovaciones:</strong> Cada día a las 9:00 (hora peninsular) se revisa la tabla Renovaciones y se envía el email que toque</li>
        </ul>
      </div>
    </div>
  );
}
