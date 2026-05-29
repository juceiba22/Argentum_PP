import React, { useEffect, useState } from 'react';
import { getPedidosConClientes } from '../services/mockData';
import { Plus, Filter } from 'lucide-react';

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    getPedidosConClientes().then(data => setPedidos(data));
  }, []);

  return (
    <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Pedidos</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestión del flujo de órdenes</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={18} /> Nuevo Pedido
        </button>
      </header>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end' }}>
           <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
             <Filter size={16} /> Filtrar
           </button>
        </div>
        
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase' }}>ID</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase' }}>Cliente</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase' }}>Fecha</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase' }}>Total</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map(pedido => (
                <tr key={pedido.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>#{pedido.id}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 500 }}>{pedido.clienteNombre}</td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{pedido.createdAt}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 600 }}>${pedido.total.toLocaleString()}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span className={`badge badge-${pedido.estado.toLowerCase()}`}>
                      {pedido.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
