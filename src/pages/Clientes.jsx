import React, { useEffect, useState } from 'react';
import { getClientes } from '../services/mockData';
import { Plus, Search } from 'lucide-react';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    getClientes().then(data => setClientes(data));
  }, []);

  return (
    <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Clientes</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Administra la información de tus clientes</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={18} /> Nuevo Cliente
        </button>
      </header>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input type="text" className="input-field" placeholder="Buscar cliente..." style={{ paddingLeft: '40px', marginBottom: 0 }} />
          </div>
        </div>
        
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase' }}>Nombre</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase' }}>Email</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase' }}>Teléfono</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase' }}>Registro</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(cliente => (
                <tr key={cliente.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '16px 20px', fontWeight: 500 }}>{cliente.nombre}</td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{cliente.email}</td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{cliente.telefono}</td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{cliente.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
