import React, { useEffect, useState } from 'react';
import { Receipt, Plus, Trash2, Calendar, Check, DollarSign, Activity, Wallet } from 'lucide-react';
import { getGastos, registrarGasto } from '../services/erpApi';
import { useAuth } from '../context/AuthContext';

const CATEGORIAS_Y_RUBROS = {
  'Costos Fijos': [
    'Seguros',
    'Servicio de agua',
    'Servicio de luz',
    'Impuestos',
    'Alquileres',
    'Servicio de telefonía móvil'
  ],
  'Depreciación de Capital': [
    'Equipamiento'
  ],
  'Salario / Ganancia': [
    'Salario',
    'Ganancia'
  ]
};

export default function Gastos() {
  const { user } = useAuth();
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Form
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [categoriaPrincipal, setCategoriaPrincipal] = useState('');
  const [rubro, setRubro] = useState('');
  const [importe, setImporte] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Extra fields
  const [regularidad, setRegularidad] = useState('Mensual');
  const [diaPago, setDiaPago] = useState('');
  const [modalidad, setModalidad] = useState('');
  const [tipoEquipamiento, setTipoEquipamiento] = useState('');
  const [marca, setMarca] = useState('');
  const [vidaUtil, setVidaUtil] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getGastos();
      setGastos(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update rubro if categoria changes
  useEffect(() => {
    setRubro('');
  }, [categoriaPrincipal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fecha || !categoriaPrincipal || !rubro || !importe) return;
    setProcesando(true);
    setMensaje(null);

    try {
      let finalDescripcion = descripcion;
      
      if (categoriaPrincipal === 'Costos Fijos') {
        const extraData = `[${regularidad} | Día: ${diaPago || 'S/D'} | Mod: ${modalidad || 'S/D'}]`;
        finalDescripcion = descripcion ? `${extraData} ${descripcion}` : extraData;
      } else if (categoriaPrincipal === 'Depreciación de Capital') {
        const extraData = `[Eq: ${tipoEquipamiento || 'S/D'} | Marca: ${marca || 'S/D'} | Vida Útil: ${vidaUtil ? vidaUtil + ' años' : 'S/D'}]`;
        finalDescripcion = descripcion ? `${extraData} ${descripcion}` : extraData;
      }

      await registrarGasto(
        {
          fecha,
          categoria_principal: categoriaPrincipal,
          rubro,
          importe: Number(importe),
          descripcion: finalDescripcion
        },
        user?.email || 'Sistema'
      );
      
      setMensaje({ type: 'success', text: 'Gasto registrado y debitado correctamente de la liquidez.' });
      
      // Reset form
      setCategoriaPrincipal('');
      setRubro('');
      setImporte('');
      setDescripcion('');
      setRegularidad('Mensual');
      setDiaPago('');
      setModalidad('');
      setTipoEquipamiento('');
      setMarca('');
      setVidaUtil('');
      
      fetchData();
    } catch (error) {
      console.error(error);
      setMensaje({ type: 'error', text: 'Error al registrar el gasto.' });
    } finally {
      setProcesando(false);
    }
  };

  // Calcular totales del MES ACTUAL
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const gastosMesActual = gastos.filter(g => {
    if (!g.fecha) return false;
    const gDate = new Date(g.fecha);
    return gDate.getMonth() === currentMonth && gDate.getFullYear() === currentYear && g.activo !== false;
  });

  const totalCostosFijos = gastosMesActual
    .filter(g => g.categoria_principal === 'Costos Fijos')
    .reduce((acc, g) => acc + Number(g.importe), 0);

  const totalDepreciacion = gastosMesActual
    .filter(g => g.categoria_principal === 'Depreciación de Capital')
    .reduce((acc, g) => acc + Number(g.importe), 0);

  const totalSalarios = gastosMesActual
    .filter(g => g.categoria_principal === 'Salario / Ganancia')
    .reduce((acc, g) => acc + Number(g.importe), 0);

  const totalGeneral = totalCostosFijos + totalDepreciacion + totalSalarios;

  const formatearFecha = (dateString) => {
    if (!dateString) return 'S/D';
    return new Date(dateString + 'T12:00:00').toLocaleDateString(); // Evitar corrimiento por timezone
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Gestión de Gastos Operativos</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Módulo ERP: Registro de costos fijos, salarios y depreciación.</p>
      </header>

      {/* DASHBOARD DE TOTALES DEL MES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--warning)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Costos Fijos (Mes)</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>${totalCostosFijos.toLocaleString()}</h3>
        </div>
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #8b5cf6' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Depreciación (Mes)</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6' }}>${totalDepreciacion.toLocaleString()}</h3>
        </div>
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #3b82f6' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Salarios/Ganancias (Mes)</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>${totalSalarios.toLocaleString()}</h3>
        </div>
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>Total Gastos (Mes)</p>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--danger)' }}>${totalGeneral.toLocaleString()}</h3>
        </div>
      </div>

      {mensaje && (
        <div style={{
          padding: '16px', marginBottom: '24px', borderRadius: '8px',
          backgroundColor: mensaje.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: mensaje.type === 'success' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${mensaje.type === 'success' ? 'var(--success)' : 'var(--danger)'}`
        }}>
          {mensaje.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
        
        {/* FORMULARIO */}
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={20} color="var(--accent-primary)" /> Registrar Gasto
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Fecha</label>
              <input type="date" className="input-field" value={fecha} onChange={e => setFecha(e.target.value)} required />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Categoría Principal</label>
              <select className="input-field" value={categoriaPrincipal} onChange={e => setCategoriaPrincipal(e.target.value)} style={{ appearance: 'auto' }} required>
                <option value="">-- Seleccionar Categoría --</option>
                {Object.keys(CATEGORIAS_Y_RUBROS).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Rubro</label>
              <select className="input-field" value={rubro} onChange={e => setRubro(e.target.value)} style={{ appearance: 'auto' }} disabled={!categoriaPrincipal} required>
                <option value="">-- Seleccionar Rubro --</option>
                {categoriaPrincipal && CATEGORIAS_Y_RUBROS[categoriaPrincipal].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {categoriaPrincipal === 'Costos Fijos' && (
              <>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Regularidad</label>
                  <select className="input-field" value={regularidad} onChange={e => setRegularidad(e.target.value)} style={{ appearance: 'auto' }}>
                    <option value="Mensual">Mensual</option>
                    <option value="Bimestral">Bimestral</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Día de Pago/Cobro</label>
                    <input type="number" min="1" max="31" className="input-field" value={diaPago} onChange={e => setDiaPago(e.target.value)} placeholder="Ej. 10" />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Modalidad</label>
                    <input type="text" className="input-field" value={modalidad} onChange={e => setModalidad(e.target.value)} placeholder="Ej. Transferencia..." />
                  </div>
                </div>
              </>
            )}

            {categoriaPrincipal === 'Depreciación de Capital' && (
              <>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Tipo Equipamiento</label>
                  <input type="text" className="input-field" value={tipoEquipamiento} onChange={e => setTipoEquipamiento(e.target.value)} placeholder="Ej. Heladera Exhibidora" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Marca</label>
                    <input type="text" className="input-field" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Ej. Gafa" />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Vida Útil (Años)</label>
                    <input type="number" className="input-field" value={vidaUtil} onChange={e => setVidaUtil(e.target.value)} placeholder="Ej. 5" />
                  </div>
                </div>
              </>
            )}

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Importe ($)</label>
              <input type="number" step="0.01" min="0" className="input-field" value={importe} onChange={e => setImporte(e.target.value)} placeholder="0.00" required />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Descripción (Opcional)</label>
              <textarea className="input-field" value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Detalles del gasto..." rows="2" />
            </div>

            <button type="submit" className="btn btn-primary" disabled={procesando || !fecha || !categoriaPrincipal || !rubro || !importe} style={{ marginTop: '8px' }}>
              {procesando ? 'Procesando...' : 'Guardar Gasto'}
            </button>
          </form>
        </div>

        {/* HISTORIAL / TABLA */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--text-primary)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Historial de Gastos</h3>
          </div>
          
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)' }}>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Rubro</th>
                  <th>Descripción</th>
                  <th style={{ textAlign: 'right' }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando historial...</td></tr>
                ) : gastos.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay gastos registrados.</td></tr>
                ) : (
                  gastos.map(g => (
                    <tr key={g.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s', opacity: g.activo === false ? 0.5 : 1 }}>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {formatearFecha(g.fecha)}
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {g.categoria_principal}
                      </td>
                      <td style={{ fontSize: '0.9rem' }}>
                        {g.rubro}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {g.descripcion || '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--danger)', fontSize: '1.05rem' }}>
                        ${Number(g.importe).toLocaleString()}
                        {g.activo === false && <span style={{display:'block', fontSize:'0.7rem', color:'var(--warning)'}}>Anulado</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
