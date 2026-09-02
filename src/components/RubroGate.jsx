import React, { useState } from 'react';
import { Store, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { seedProductosIniciales } from '../utils/starterProducts';
import { RUBROS_CATALOGO } from './OnboardingWizard';

// Se muestra cuando el tenant todavía no tiene un rubro asignado (típico de
// un alta por "Continuar con Google": ese flujo nunca pasa por
// OnboardingWizard, así que nadie le preguntó el rubro y el catálogo inicial
// de productos nunca se sembró -- ver comentario en AuthContext.jsx, paso
// 3.6). Bloquea el resto de la app hasta que el usuario elige uno, guarda el
// rubro en tenants y recién ahí siembra los 15 productos iniciales.
export default function RubroGate() {
  const { tenantId, refetchTenantInfo } = useAuth();
  const [rubro, setRubro] = useState('Carnicería');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleConfirmar = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          rubro,
          onboarding_completado: true,
          onboarding_paso_actual: 4
        })
        .eq('id', tenantId);

      if (updateError) throw updateError;

      await seedProductosIniciales(tenantId, rubro);
      await refetchTenantInfo();
    } catch (err) {
      console.error('Error al guardar el rubro elegido:', err);
      setErrorMsg(err.message || 'No se pudo guardar el rubro. Intentá nuevamente.');
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
      background: 'radial-gradient(circle at top right, rgba(197, 160, 89, 0.05), transparent 50%), radial-gradient(circle at bottom left, rgba(197, 160, 89, 0.05), transparent 50%)'
    }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '40px', width: '100%', maxWidth: '460px', textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          backgroundColor: 'var(--accent-primary)', color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px auto'
        }}>
          <Store size={32} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
          ¡Un último paso!
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '24px' }}>
          Contanos a qué rubro pertenece tu comercio para cargar automáticamente un catálogo inicial de 15 productos y dejar todo listo para que empieces a vender.
        </p>

        <div className="input-group" style={{ textAlign: 'left' }}>
          <label className="input-label">Rubro del Comercio *</label>
          <select
            className="input-field"
            value={rubro}
            onChange={(e) => setRubro(e.target.value)}
            style={{ cursor: 'pointer', fontWeight: 600 }}
          >
            {RUBROS_CATALOGO.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

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
          {loading ? 'Configurando tu comercio...' : 'Confirmar y Continuar'}
        </button>
      </div>
    </div>
  );
}
