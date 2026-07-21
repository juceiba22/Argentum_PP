import React from 'react';
import RegistrosCaja from './RegistrosCaja';

export default function Caja() {
  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Detalle de Caja</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Módulo ERP: Gestión y registro del efectivo en caja.</p>
      </header>

      <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
        <RegistrosCaja />
      </div>
    </div>
  );
}
