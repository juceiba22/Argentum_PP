import React, { useState } from 'react';
import { Beef, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { seedProductosIniciales, RUBRO_CARNICERIA, STARTER_PRODUCTS_CARNICERIA } from '../utils/starterProducts';

// Se muestra cuando el tenant todavía no tiene rubro asignado: cuentas
// creadas antes de que Argentum pasara a ser exclusivo para carnicerías
// (típicamente altas por "Continuar con Google", que nunca sembraban el
// catálogo). Hoy todo tenant nuevo nace con rubro Carnicería (ver
// AuthContext), así que esto solo completa la configuración de esas cuentas:
// guarda el rubro y siembra el catálogo inicial de cortes una única vez.
export default function RubroGate() {
  const { tenantId, refetchTenantInfo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleConfirmar = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          rubro: RUBRO_CARNICERIA,
          onboarding_completado: true,
          onboarding_paso_actual: 4
        })
        .eq('id', tenantId);

      if (updateError) throw updateError;

      await seedProductosIniciales(tenantId);
      await refetchTenantInfo();
    } catch (err) {
      console.error('Error al configurar la carnicería:', err);
      setErrorMsg(err.message || 'No se pudo completar la configuración. Intentá nuevamente.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(circle at top right, rgba(142, 27, 27, 0.05), transparent 50%), radial-gradient(circle at bottom left, rgba(142, 27, 27, 0.05), transparent 50%)'
    }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '40px', width: '100%', maxWidth: '460px', textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          backgroundColor: 'var(--accent-primary)', color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px auto'
        }}>
          <Beef size={32} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
          ¡Preparemos tu carnicería!
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '24px' }}>
          Vamos a cargar en tu stock un catálogo inicial de {STARTER_PRODUCTS_CARNICERIA.length} cortes (vacuno, cerdo, pollo, embutidos y achuras) con precios de referencia por kg. Después podés editarlos, borrarlos o sumar los tuyos desde Inventario.
        </p>

        {errorMsg && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(183, 65, 52, 0.05)', border: '1px solid var(--danger)', borderRadius: '4px', color: 'var(--danger)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirmar}
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%', marginTop: '24px', padding: '12px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
          {loading ? 'Preparando tu carnicería...' : 'Cargar catálogo y empezar'}
        </button>
      </div>
    </div>
  );
}
