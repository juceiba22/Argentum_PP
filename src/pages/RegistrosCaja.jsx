import React, { useEffect, useState } from 'react';
import { Wallet, CreditCard, DollarSign, RefreshCw, FileText, Calendar } from 'lucide-react';
import { getCobrosRealizados } from '../services/pedidosApi';

export default function RegistrosCaja() {
  const [cobros, setCobros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState({
    totalRecaudado: 0,
    totalMercadoPago: 0,
    totalOtroMedio: 0,
    cantidadTransacciones: 0
  });

  const cargarCobros = async () => {
    setLoading(true);
    try {
      const data = await getCobrosRealizados();
      setCobros(data || []);
      
      // Calcular métricas
      let totalRecaudado = 0;
      let totalMercadoPago = 0;
      let totalOtroMedio = 0;

      data.forEach(cobro => {
        const monto = Number(cobro.total) || 0;
        totalRecaudado += monto;
        
        // Asumimos mercado_pago_point basado en la función de integración anterior
        if (cobro.medio_pago === 'mercado_pago_point') {
          totalMercadoPago += monto;
        } else {
          // Efectivo, tarjetas manuales, etc.
          totalOtroMedio += monto;
        }
      });

      setResumen({
        totalRecaudado,
        totalMercadoPago,
        totalOtroMedio,
        cantidadTransacciones: data.length
      });

    } catch (error) {
      console.error("Error al cargar auditoría de cobros:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCobros();
  }, []);

  const formatearFecha = (isoString) => {
    if (!isoString) return 'S/D';
    return new Date(isoString).toLocaleString([], { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Auditoría de Caja</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Registro detallado de todos los cobros y conciliación</p>
        </div>
        <button onClick={cargarCobros} className="btn btn-secondary">
          <RefreshCw size={16} /> Refrescar Cierre
        </button>
      </header>

      {/* MÉTRICAS DE CIERRE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '4px solid #10b981' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Total Recaudado</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>${resumen.totalRecaudado.toLocaleString()}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '4px solid #009ee3' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 158, 227, 0.15)', color: '#009ee3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Mercado Pago Point</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>${resumen.totalMercadoPago.toLocaleString()}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '4px solid #8b5cf6' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Otros Medios (Caja)</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>${resumen.totalOtroMedio.toLocaleString()}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '4px solid var(--accent-primary)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(197, 160, 89, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Transacciones</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{resumen.cantidadTransacciones}</h3>
          </div>
        </div>
      </div>

      {/* TABLA DE REGISTROS */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} color="var(--text-primary)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Detalle de Operaciones Pagadas</h3>
        </div>
        
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)' }}>
                <th>Fecha y Hora</th>
                <th>ID Pedido</th>
                <th>Medio de Pago</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando registros contables...</td></tr>
              ) : cobros.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay cobros registrados en la base de datos.</td></tr>
              ) : (
                cobros.map(cobro => (
                  <tr key={cobro.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {formatearFecha(cobro.fecha_cobro || cobro.updated_at)}
                    </td>
                    <td>
                      <code className="code-dark" style={{ fontSize: '0.75rem', padding: '4px', borderRadius: '4px' }}>
                        {cobro.id.substring(0,8).toUpperCase()}
                      </code>
                    </td>
                    <td>
                      {cobro.medio_pago === 'mercado_pago_point' ? (
                        <span style={{ background: '#009ee322', color: '#009ee3', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                          MP Point
                        </span>
                      ) : cobro.medio_pago ? (
                        <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                          {cobro.medio_pago}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>Efectivo / Manual</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1.1rem' }}>
                      ${Number(cobro.total).toLocaleString()}
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
