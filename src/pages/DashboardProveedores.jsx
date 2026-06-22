import React, { useEffect, useState } from 'react';
import { Truck, ShoppingBag, DollarSign, Calendar } from 'lucide-react';
import { getProveedores, getCompras } from '../services/erpApi';

export default function DashboardProveedores() {
  const [stats, setStats] = useState({ totalProveedores: 0, totalCompras: 0, importeComprado: 0 });
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      try {
        const [provData, comprasData] = await Promise.all([getProveedores(), getCompras()]);
        
        const importeComprado = comprasData ? comprasData.reduce((acc, c) => acc + Number(c.importe), 0) : 0;
        
        setStats({
          totalProveedores: provData?.length || 0,
          totalCompras: comprasData?.length || 0,
          importeComprado
        });
        
        setCompras(comprasData || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDatos();
  }, []);

  const formatearFecha = (isoString) => {
    if (!isoString) return 'S/D';
    return new Date(isoString).toLocaleDateString();
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Dashboard de Proveedores</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Módulo ERP: Análisis de reposición de stock y gastos de compras.</p>
      </header>

      {/* MÉTRICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '4px solid #3b82f6' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Proveedores Activos</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{loading ? '...' : stats.totalProveedores}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '4px solid #8b5cf6' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Compras Realizadas</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{loading ? '...' : stats.totalCompras}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '4px solid var(--danger)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Importe Total Comprado</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>
              ${loading ? '...' : stats.importeComprado.toLocaleString()}
            </h3>
          </div>
        </div>

      </div>

      {/* TABLA DE ÚLTIMAS COMPRAS */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} color="var(--text-primary)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Registro de Compras Recientes</h3>
        </div>
        
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)' }}>
                <th>ID Ref</th>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando compras...</td></tr>
              ) : compras.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay compras registradas.</td></tr>
              ) : (
                compras.map(comp => (
                  <tr key={comp.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                    <td>
                      <code className="code-dark" style={{ fontSize: '0.75rem', padding: '4px', borderRadius: '4px' }}>
                        {comp.id.substring(0,8).toUpperCase()}
                      </code>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {formatearFecha(comp.fecha || comp.created_at)}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {comp.proveedores?.nombre || 'Proveedor Eliminado'}
                    </td>
                    <td>
                      <span style={{ 
                        background: comp.estado === 'Pagada' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                        color: comp.estado === 'Pagada' ? 'var(--success)' : 'var(--warning)', 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 
                      }}>
                        {comp.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--danger)', fontSize: '1.1rem' }}>
                      ${Number(comp.importe).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
