import React, { useEffect, useState } from 'react';
import { Calculator, Calendar, DollarSign, Package, PieChart, TrendingUp, Filter } from 'lucide-react';
import { getGastos, getCompras, getComprasDetalle } from '../services/erpApi';
import { getInventario } from '../services/inventarioApi';

export default function CalculadoraCostos() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);

  // Datos crudos
  const [gastos, setGastos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [comprasDetalle, setComprasDetalle] = useState([]);
  const [productos, setProductos] = useState([]);

  // Variables de Calculadora General
  const [costosMensuales, setCostosMensuales] = useState({
    fijos: 0,
    depreciacion: 0,
    salarios: 0,
    total: 0
  });

  // Variables de Calculadora por Producto
  const [productoIdSeleccionado, setProductoIdSeleccionado] = useState('');
  const [volumenVentasEstimado, setVolumenVentasEstimado] = useState(1000); // Kgs por mes

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [g, c, cd, p] = await Promise.all([
          getGastos(),
          getCompras(),
          getComprasDetalle(),
          getInventario()
        ]);
        
        setGastos(g || []);
        setCompras(c || []);
        setComprasDetalle(cd || []);
        setProductos(p || []);

        calcularCostosBase(g || []);
      } catch (error) {
        console.error("Error al cargar datos para la calculadora", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const calcularCostosBase = (gastosList) => {
    let fijosMes = 0;
    let depreciacionMes = 0;
    let salariosMes = 0;

    gastosList.filter(g => g.activo !== false).forEach(g => {
      const desc = g.descripcion || '';
      const importe = Number(g.importe) || 0;

      if (g.categoria_principal === 'Costos Fijos') {
        // Detectar regularidad en descripcion: ej. [Bimestral | ...]
        let divisor = 1; // Mensual
        if (desc.includes('[Bimestral')) divisor = 2;
        if (desc.includes('[Anual')) divisor = 12;
        if (desc.includes('[Semanal')) divisor = 0.25;

        fijosMes += (importe / divisor);
      } 
      else if (g.categoria_principal === 'Depreciación de Capital') {
        // Extraer Vida Util, ej: Vida Útil: 5 años
        let aniosVidaUtil = 5; // Default 5 años
        const match = desc.match(/Vida Útil:\s*(\d+)/);
        if (match && match[1]) {
          aniosVidaUtil = parseInt(match[1], 10);
        }
        
        // El importe registrado es el valor actual estimado de la máquina
        const depreciacionAnual = importe / aniosVidaUtil;
        depreciacionMes += (depreciacionAnual / 12);
      }
      else if (g.categoria_principal === 'Salario / Ganancia') {
        // Asumimos salarios y retiros mensuales por defecto
        salariosMes += importe;
      }
    });

    setCostosMensuales({
      fijos: fijosMes,
      depreciacion: depreciacionMes,
      salarios: salariosMes,
      total: fijosMes + depreciacionMes + salariosMes
    });
  };

  // Cálculos Derivados (General)
  const costoDiario = costosMensuales.total / 30;
  const costoSemanal = costosMensuales.total / 4.33; // 4.33 semanas por mes
  const costoAnual = costosMensuales.total * 12;

  // Calculos de Compras del Mes Actual
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const comprasMesActual = compras.filter(c => {
    if (!c.fecha) return false;
    const d = new Date(c.fecha);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalComprasMes = comprasMesActual.reduce((acc, c) => acc + Number(c.importe), 0);

  // Calculos por Producto
  const getCostoProducto = () => {
    if (!productoIdSeleccionado) return null;
    
    // Buscar el producto
    const prod = productos.find(p => p.id === productoIdSeleccionado);
    
    // Buscar la última compra de este producto
    const comprasProd = comprasDetalle.filter(cd => cd.producto_id === productoIdSeleccionado);
    let ultimoPrecioCompra = 0;
    
    if (comprasProd.length > 0) {
      // Ordenar por fecha (las compras_detalle tienen created_at y el relation compras.fecha)
      // Como getComprasDetalle las trae ordenadas por created_at descendente, el primero es el último
      ultimoPrecioCompra = Number(comprasProd[0].precio_unitario);
    }

    // Calcular prorrateo de costos fijos por Kg
    // (Costo Operativo Mensual / Volumen Vendido Mensual) = Overhead por Kg
    const overheadPorKg = costosMensuales.total / (Number(volumenVentasEstimado) || 1);

    const costoReal = ultimoPrecioCompra + overheadPorKg;

    return {
      nombre: prod?.nombre || '',
      ultimoPrecioCompra,
      overheadPorKg,
      costoReal,
      historialCompras: comprasProd.slice(0, 5) // Últimas 5
    };
  };

  const prodCalc = getCostoProducto();

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Calculator color="var(--accent-primary)" /> Calculadora de Costos
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Análisis de rentabilidad, prorrateo de costos operativos y depreciación.</p>
      </header>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--glass-border)', marginBottom: '32px' }}>
        <button 
          onClick={() => setActiveTab('general')}
          style={{ 
            padding: '12px 24px', 
            background: 'transparent', 
            border: 'none', 
            borderBottom: activeTab === 'general' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'general' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'general' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '1.05rem',
            transition: 'all 0.2s'
          }}
        >
          Análisis Operativo (Tiempo)
        </button>
        <button 
          onClick={() => setActiveTab('producto')}
          style={{ 
            padding: '12px 24px', 
            background: 'transparent', 
            border: 'none', 
            borderBottom: activeTab === 'producto' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'producto' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'producto' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '1.05rem',
            transition: 'all 0.2s'
          }}
        >
          Calculadora por Producto
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando datos financieros y de compras...</div>
      ) : activeTab === 'general' ? (
        
        /* ----------------------------------------------------
           TAB 1: CALCULADORA GENERAL 
        ---------------------------------------------------- */
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            
            {/* Desglose Mensual */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChart size={20} color="var(--accent-primary)" /> Base de Costos (Prorrateo Mensual)
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Costos Fijos</span>
                <span style={{ fontWeight: 600 }}>${costosMensuales.fijos.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Depreciación Maquinaria</span>
                <span style={{ fontWeight: 600 }}>${costosMensuales.depreciacion.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Salarios y Ganancias</span>
                <span style={{ fontWeight: 600 }}>${costosMensuales.salarios.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '2px solid var(--danger)', color: 'var(--danger)', fontWeight: 900, fontSize: '1.2rem' }}>
                <span>Total Operativo (Mes)</span>
                <span>${costosMensuales.total.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
              </div>
            </div>

            {/* Proyección Temporal */}
            <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(145deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.9) 100%)' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} color="#3b82f6" /> Costo Operativo en el Tiempo
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>Costo Diario</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>${costoDiario.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>Costo Semanal</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>${costoSemanal.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                </div>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #8b5cf6', marginBottom: '16px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>Costo Mensual</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>${costosMensuales.total.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>Proyección Anual</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>${costoAnual.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
              </div>
            </div>

            {/* Inversiones / Compras del Mes */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={20} color="var(--success)" /> Inversión en Mercadería
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                Compras a proveedores consolidadas en el mes en curso ({new Date().toLocaleString('es', { month: 'long' })}).
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '8px' }}>Compras del Mes</p>
                  <p style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--success)' }}>${totalComprasMes.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      ) : (

        /* ----------------------------------------------------
           TAB 2: CALCULADORA POR PRODUCTO 
        ---------------------------------------------------- */
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
          
          <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={20} color="var(--accent-primary)" /> Configurar Cálculo
            </h3>
            
            <div className="input-group">
              <label className="input-label">Seleccionar Producto</label>
              <select 
                className="input-field" 
                value={productoIdSeleccionado} 
                onChange={e => setProductoIdSeleccionado(e.target.value)}
                style={{ appearance: 'auto' }}
              >
                <option value="">-- Elija un producto --</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ marginTop: '24px' }}>
              <label className="input-label">Volumen Total Vendido al Mes (Estimado KG)</label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>
                Ingrese cuántos kilos totales (de todos los productos) estima vender al mes. Esto permite dividir el "Costo Operativo" ($ {costosMensuales.total.toLocaleString(undefined, {maximumFractionDigits:0})}) entre todos los kilos para obtener el Costo Overhead por Kg.
              </p>
              <input 
                type="number" 
                className="input-field" 
                value={volumenVentasEstimado} 
                onChange={e => setVolumenVentasEstimado(e.target.value)} 
                min="1"
              />
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '32px' }}>
            {!productoIdSeleccionado ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                <Package size={48} style={{ opacity: 0.2, margin: '0 auto 16px auto' }} />
                <p>Seleccione un producto del inventario a la izquierda para calcular su costo real.</p>
              </div>
            ) : prodCalc ? (
              <div>
                <h2 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>{prodCalc.nombre}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Desglose de rentabilidad y costo real por Kilogramo.</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }}>
                  <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase' }}>Último Precio Compra</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: 800 }}>${prodCalc.ultimoPrecioCompra.toLocaleString()}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Valor base pagado al proveedor</p>
                  </div>
                  
                  <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase' }}>Costo Operativo (Overhead)</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--warning)' }}>+ ${prodCalc.overheadPorKg.toLocaleString(undefined, {maximumFractionDigits:2})}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Prorrateo de Fijos, Depreciación y Salarios</p>
                  </div>

                  <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '2px solid var(--danger)' }}>
                    <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 800 }}>Costo Real Total</p>
                    <p style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--danger)' }}>${prodCalc.costoReal.toLocaleString(undefined, {maximumFractionDigits:2})}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '8px', opacity: 0.8 }}>Por cada KG (Base mínima para no perder dinero)</p>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>Historial de Compras (Últimas 5)</h3>
                {prodCalc.historialCompras.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No hay compras registradas en el ERP para este producto.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        <th style={{ padding: '8px 0' }}>Fecha</th>
                        <th style={{ padding: '8px 0' }}>Cantidad (Kg)</th>
                        <th style={{ padding: '8px 0', textAlign: 'right' }}>Precio Unitario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prodCalc.historialCompras.map((hc, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '12px 0' }}>{new Date(hc.compras?.fecha || hc.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '12px 0' }}>{hc.cantidad} kg</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600 }}>${Number(hc.precio_unitario).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : null}
          </div>

        </div>
      )}

    </div>
  );
}
