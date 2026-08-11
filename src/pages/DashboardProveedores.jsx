import React, { useEffect, useState } from 'react';
import { 
  BarChart2, DollarSign, TrendingUp, TrendingDown, Package, 
  ShoppingCart, CreditCard, AlertTriangle, CheckCircle2, 
  Calendar, PieChart, Sparkles, RefreshCw, Loader2, ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';
import { getEstadisticasGenerales } from '../services/erpApi';
import { useAuth } from '../context/AuthContext';

export default function DashboardProveedores() {
  const { tenantId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('historico'); // 'historico', 'mes', '7dias'
  const [data, setData] = useState({
    ventasTotales: 0,
    cantidadVentas: 0,
    ticketPromedio: 0,
    ingresosTotales: 0,
    egresosTotales: 0,
    margenNeto: 0,
    porcentajeMargen: 0,
    valorCostoStock: 0,
    valorVentaStock: 0,
    gananciaLatenteStock: 0,
    stockOptimoCount: 0,
    stockBajoCount: 0,
    mediosPagoBreakdown: { efectivo: 0, mercado_pago: 0, cuenta_dni: 0, transferencia: 0, tarjeta: 0 },
    topProductos: [],
    gastosPorCategoria: {},
    ultimosPedidos: [],
    ultimasCompras: []
  });

  const cargarEstadisticas = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getEstadisticasGenerales(tenantId);
      setData(res);
    } catch (e) {
      console.error('Error al cargar estadísticas generales:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEstadisticas();
  }, [tenantId]);

  const formatearMoneda = (monto) => {
    return `$${Number(monto || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatearFecha = (isoString) => {
    if (!isoString) return 'S/D';
    return new Date(isoString).toLocaleDateString();
  };

  // Datos procesados para el gráfico de Medios de Pago
  const totalMediosPago = Object.values(data.mediosPagoBreakdown).reduce((acc, curr) => acc + curr, 0) || 1;
  const mediosPagoConfig = [
    { key: 'efectivo', label: 'Efectivo', color: '#10b981' },
    { key: 'mercado_pago', label: 'Mercado Pago', color: '#38bdf8' },
    { key: 'cuenta_dni', label: 'Cuenta DNI', color: '#22c55e' },
    { key: 'transferencia', label: 'Transferencia', color: '#a855f7' },
    { key: 'tarjeta', label: 'Tarjeta Crédito', color: '#f97316' }
  ];

  // Cálculo para SVG Donut Chart
  let cumulativePercent = 0;
  const pieSlices = mediosPagoConfig.map(cfg => {
    const amount = data.mediosPagoBreakdown[cfg.key] || 0;
    const percent = (amount / totalMediosPago) * 100;
    const startAngle = (cumulativePercent / 100) * 360;
    cumulativePercent += percent;
    const endAngle = (cumulativePercent / 100) * 360;
    return { ...cfg, amount, percent, startAngle, endAngle };
  });

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* ENCABEZADO Y FILTROS */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BarChart2 size={36} style={{ color: 'var(--accent-primary)' }} />
            Estadísticas e Inteligencia del Negocio
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Panel analítico integral para el seguimiento de ventas, margen neto, rotación de stock y rentabilidad.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            type="button" 
            onClick={cargarEstadisticas} 
            className="btn btn-secondary" 
            style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            title="Recargar métricas"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: '16px' }}>
          <Loader2 className="animate-spin" size={44} style={{ color: 'var(--accent-primary)' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Calculando indicadores y estadísticas del negocio...</p>
        </div>
      ) : (
        <>
          {/* SECCIÓN 1: KPI CARDS DE DECISIÓN */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            
            {/* Card 1: Ventas Totales */}
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--accent-primary)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Ventas Realizadas
                </p>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(197, 160, 89, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingCart size={22} />
                </div>
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>
                {formatearMoneda(data.ventasTotales)}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data.cantidadVentas} ventas</span>
                <span>• Ticket Prom: <strong>{formatearMoneda(data.ticketPromedio)}</strong></span>
              </div>
            </div>

            {/* Card 2: Margen Neto y Rentabilidad */}
            <div className="glass-panel" style={{ padding: '24px', borderLeft: `4px solid ${data.margenNeto >= 0 ? 'var(--success)' : 'var(--danger)'}`, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Margen Neto Estimado
                </p>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '10px', 
                  background: data.margenNeto >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                  color: data.margenNeto >= 0 ? 'var(--success)' : 'var(--danger)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  {data.margenNeto >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                </div>
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px', color: data.margenNeto >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {formatearMoneda(data.margenNeto)}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: '12px', fontWeight: 700,
                  background: data.porcentajeMargen >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: data.porcentajeMargen >= 0 ? 'var(--success)' : 'var(--danger)'
                }}>
                  {data.porcentajeMargen >= 0 ? `+${data.porcentajeMargen}%` : `${data.porcentajeMargen}%`} Margen
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>Ingresos vs Egresos</span>
              </div>
            </div>

            {/* Card 3: Valorización de Stock */}
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #8b5cf6', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Valorización de Stock
                </p>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={22} />
                </div>
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>
                {formatearMoneda(data.valorVentaStock)}
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Inversión Costo: <strong>{formatearMoneda(data.valorCostoStock)}</strong>
                <div style={{ color: 'var(--success)', fontWeight: 700, marginTop: '2px' }}>
                  Ganancia Latente: +{formatearMoneda(data.gananciaLatenteStock)}
                </div>
              </div>
            </div>

            {/* Card 4: Salud de Inventario */}
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #3b82f6', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Salud de Inventario
                </p>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={22} />
                </div>
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px', color: '#3b82f6' }}>
                {data.stockOptimoCount + data.stockBajoCount} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Productos</span>
              </h2>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} /> {data.stockOptimoCount} Óptimos
                </span>
                <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={14} /> {data.stockBajoCount} Bajo Stock
                </span>
              </div>
            </div>

          </div>

          {/* SECCIÓN 2: GRÁFICOS VISUALES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            
            {/* Gráfico A: Distribución por Medio de Pago */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PieChart size={22} style={{ color: 'var(--accent-primary)' }} />
                Ventas por Medio de Pago
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                {/* SVG Visual Bar / Donut */}
                <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {mediosPagoConfig.map(cfg => {
                    const amount = data.mediosPagoBreakdown[cfg.key] || 0;
                    const pct = totalMediosPago > 0 ? ((amount / totalMediosPago) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={cfg.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cfg.color }}></span>
                            {cfg.label}
                          </span>
                          <span style={{ fontWeight: 700 }}>{formatearMoneda(amount)} ({pct}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: cfg.color, borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Gráfico B: Balance Financiero Flujo de Caja */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <TrendingUp size={22} style={{ color: 'var(--accent-primary)' }} />
                Flujo Financiero (Ingresos vs Egresos)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Barra de Ingresos */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ArrowUpRight size={18} /> Ingresos Totales
                    </span>
                    <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1.1rem' }}>
                      {formatearMoneda(data.ingresosTotales)}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '14px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '7px', overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--success)', borderRadius: '7px' }}></div>
                  </div>
                </div>

                {/* Barra de Egresos */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ArrowDownRight size={18} /> Egresos Totales (Compras + Gastos)
                    </span>
                    <span style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '1.1rem' }}>
                      {formatearMoneda(data.egresosTotales)}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '14px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '7px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: data.ingresosTotales > 0 ? `${Math.min(100, (data.egresosTotales / data.ingresosTotales) * 100)}%` : '0%', 
                      height: '100%', backgroundColor: 'var(--danger)', borderRadius: '7px', transition: 'width 0.5s ease' 
                    }}></div>
                  </div>
                </div>

                {/* Resumen Margen Liquidez */}
                <div style={{
                  padding: '14px', borderRadius: '8px', marginTop: '10px',
                  backgroundColor: data.margenNeto >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${data.margenNeto >= 0 ? 'var(--success)' : 'var(--danger)'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Resultado Neto Operativo:</span>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', color: data.margenNeto >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {formatearMoneda(data.margenNeto)}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* SECCIÓN 3: TOP PRODUCTOS Y GASTOS POR CATEGORÍA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            
            {/* Ranking Top Productos */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={22} style={{ color: 'var(--accent-primary)' }} />
                Top 5 Productos Más Vendidos
              </h3>

              {data.topProductos.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
                  Aún no hay registro de ventas por ítem.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {data.topProductos.map((p, idx) => {
                    const maxVal = data.topProductos[0]?.montoTotal || 1;
                    const widthPct = ((p.montoTotal / maxVal) * 100).toFixed(1);
                    return (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            #{idx + 1} {p.nombre} ({p.cantidad} unidades/Kg)
                          </span>
                          <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>
                            {formatearMoneda(p.montoTotal)}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${widthPct}%`, height: '100%', backgroundColor: 'var(--accent-primary)', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tarjeta de Sugerencias Inteligentes de Negocio */}
            <div className="glass-panel" style={{ padding: '28px', border: '1px solid rgba(197, 160, 89, 0.3)', background: 'linear-gradient(135deg, rgba(197, 160, 89, 0.05) 0%, rgba(0,0,0,0) 100%)' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-primary)' }}>
                <Sparkles size={22} /> Recomendaciones Inteligentes del Negocio
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem', lineHeight: 1.5 }}>
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>💡 Ticket Promedio:</strong> Tu ticket promedio por venta actual es de <strong>{formatearMoneda(data.ticketPromedio)}</strong>. Podés aumentarlo promoviendo combos en la sección de Promociones.
                </div>

                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>📦 Reposición de Inventario:</strong> Tenés <strong style={{ color: data.stockBajoCount > 0 ? 'var(--danger)' : 'var(--success)' }}>{data.stockBajoCount} productos</strong> cerca del nivel mínimo de stock. Revisá el módulo de Compras para realizar pedidos a proveedores.
                </div>

                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>💳 Canales de Cobro:</strong> El <strong>{totalMediosPago > 0 ? (((data.mediosPagoBreakdown.mercado_pago || 0) / totalMediosPago) * 100).toFixed(1) : 0}%</strong> de tus ventas ingresa por Mercado Pago.
                </div>
              </div>
            </div>

          </div>

          {/* SECCIÓN 4: TABLAS DE RESUMEN RECIENTE */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} color="var(--text-primary)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Registro de Transacciones y Compras Recientes</h3>
            </div>
            
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)' }}>
                    <th>Referencia</th>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Estado / Medio</th>
                    <th style={{ textAlign: 'right' }}>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ultimosPedidos.length === 0 && data.ultimasCompras.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay movimientos recientes registrados.</td></tr>
                  ) : (
                    <>
                      {data.ultimosPedidos.map(ped => (
                        <tr key={ped.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td>
                            <code className="code-dark" style={{ fontSize: '0.75rem', padding: '4px', borderRadius: '4px' }}>
                              VENTA #{ped.id.substring(0,8).toUpperCase()}
                            </code>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {formatearFecha(ped.created_at)}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                            Venta Directa
                          </td>
                          <td>
                            <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>
                              {ped.medio_pago || 'Efectivo'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)', fontSize: '1.05rem' }}>
                            +{formatearMoneda(ped.total)}
                          </td>
                        </tr>
                      ))}

                      {data.ultimasCompras.map(comp => (
                        <tr key={comp.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td>
                            <code className="code-dark" style={{ fontSize: '0.75rem', padding: '4px', borderRadius: '4px' }}>
                              COMPRA #{comp.id.substring(0,8).toUpperCase()}
                            </code>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {formatearFecha(comp.fecha || comp.created_at)}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--danger)' }}>
                            Compra Proveedor ({comp.proveedores?.nombre || 'S/D'})
                          </td>
                          <td>
                            <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>
                              {comp.estado || 'Pagada'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--danger)', fontSize: '1.05rem' }}>
                            -{formatearMoneda(comp.importe)}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </>
      )}

    </div>
  );
}
