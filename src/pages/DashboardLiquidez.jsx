import React, { useEffect, useState } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, Activity, Calendar, List } from 'lucide-react';
import { getIngresosY_Egresos, getMovimientos } from '../services/erpApi';
import RegistrosCaja from './RegistrosCaja';

export default function DashboardLiquidez() {
  const [showCaja, setShowCaja] = useState(false);
  const [liquidez, setLiquidez] = useState({ ingresos: 0, egresos: 0, liquidez: 0 });
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      try {
        const liqData = await getIngresosY_Egresos();
        const movData = await getMovimientos();
        
        setLiquidez(liqData);
        setMovimientos(movData || []);
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
    return new Date(isoString).toLocaleString([], { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Dashboard de Liquidez (Cash Flow)</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Módulo ERP: Análisis centralizado de flujos de dinero.</p>
        </div>
        <button onClick={() => setShowCaja(!showCaja)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <List size={18} /> {showCaja ? 'Ocultar Detalle de Caja' : 'Ver Detalle de Caja'}
        </button>
      </header>

      {showCaja && (
        <div style={{ marginBottom: '40px', padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
          <RegistrosCaja />
        </div>
      )}

      {/* MÉTRICAS DE LIQUIDEZ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '4px solid var(--success)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Ingresos Totales (Ventas)</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
              ${loading ? '...' : liquidez.ingresos.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '4px solid var(--danger)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowDownRight size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Egresos Totales (Compras/Gastos)</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>
              ${loading ? '...' : liquidez.egresos.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', borderBottom: `4px solid ${liquidez.liquidez >= 0 ? '#3b82f6' : 'var(--warning)'}` }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `rgba(${liquidez.liquidez >= 0 ? '59, 130, 246' : '245, 158, 11'}, 0.15)`, color: liquidez.liquidez >= 0 ? '#3b82f6' : 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Liquidez Disponible (Caja)</p>
            <h3 style={{ fontSize: '2rem', fontWeight: 900, color: liquidez.liquidez >= 0 ? '#f8fafc' : 'var(--warning)' }}>
              ${loading ? '...' : liquidez.liquidez.toLocaleString()}
            </h3>
          </div>
        </div>

      </div>

      {/* TABLA DE MOVIMIENTOS FINANCIEROS */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} color="var(--text-primary)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Trazabilidad de Movimientos</h3>
        </div>
        
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)' }}>
                <th>Fecha y Hora</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando movimientos financieros...</td></tr>
              ) : movimientos.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay movimientos registrados.</td></tr>
              ) : (
                movimientos.map(mov => (
                  <tr key={mov.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {formatearFecha(mov.fecha || mov.created_at)}
                    </td>
                    <td>
                      {mov.tipo === 'INGRESO' ? (
                        <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ArrowUpRight size={14} /> INGRESO
                        </span>
                      ) : (
                        <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ArrowDownRight size={14} /> EGRESO
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {mov.categoria}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {mov.descripcion || 'S/D'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: mov.tipo === 'INGRESO' ? 'var(--success)' : 'var(--danger)', fontSize: '1.1rem' }}>
                      {mov.tipo === 'INGRESO' ? '+' : '-'}${Number(mov.monto).toLocaleString()}
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
