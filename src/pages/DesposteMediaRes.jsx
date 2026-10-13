import { useEffect, useMemo, useState } from 'react';
import { Beef, Scale, Trash2, Layers, AlertCircle, CheckCircle2, PackagePlus } from 'lucide-react';
import { getInventario, addMercaderia, updateMercaderia } from '../services/inventarioApi';
import { useAuth } from '../context/AuthContext';
import {
  RENDIMIENTO_MEDIA_RES,
  SUBGRUPOS_MEDIA_RES,
  subgrupoConfigurado,
  calcularDesposte,
  cortesParaStock,
  asignarCostos,
  normalizarNombreCorte
} from '../utils/desposte';

const fmtKg = (kg) => Number(kg || 0).toLocaleString('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmtPct = (pct) => Number(pct || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
const fmtPesos = (n) => '$' + Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });

const thStyle = { padding: '10px 12px', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', fontWeight: 700 };
const tdStyle = { padding: '10px 12px', borderTop: '1px solid var(--glass-border)', fontSize: '0.92rem' };
const numStyle = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

export default function DesposteMediaRes() {
  const { tenantId } = useAuth();
  const [inventario, setInventario] = useState([]);

  const [kgMediaRes, setKgMediaRes] = useState('');
  const [precioKgMediaRes, setPrecioKgMediaRes] = useState('');
  const [rendimientoPct, setRendimientoPct] = useState((RENDIMIENTO_MEDIA_RES * 100).toFixed(2));
  const [subgruposActivos, setSubgruposActivos] = useState(SUBGRUPOS_MEDIA_RES.filter(subgrupoConfigurado).map(sg => sg.id));
  const [excluidos, setExcluidos] = useState([]);
  const [preciosNuevos, setPreciosNuevos] = useState({});

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Se incrementa para volver a leer el inventario después de sumar al stock.
  const [versionInventario, setVersionInventario] = useState(0);
  const recargarInventario = () => setVersionInventario(v => v + 1);

  useEffect(() => {
    if (!tenantId) return;
    let vigente = true;
    getInventario(tenantId)
      .then(data => { if (vigente) setInventario(data || []); })
      .catch(err => console.error('Error al cargar inventario para el desposte:', err));
    return () => { vigente = false; };
  }, [tenantId, versionInventario]);

  const inventarioPorNombre = useMemo(
    () => new Map(inventario.map(item => [normalizarNombreCorte(item.nombre), item])),
    [inventario]
  );

  const resultado = useMemo(
    () => calcularDesposte(kgMediaRes, { rendimiento: Number(rendimientoPct) / 100, subgruposActivos }),
    [kgMediaRes, rendimientoPct, subgruposActivos]
  );

  // Cortes que entran al stock, con su producto de inventario (si existe),
  // el precio de venta vigente y el costo por kg asignado.
  const cortes = useMemo(() => {
    const base = cortesParaStock(resultado).map(c => {
      const producto = inventarioPorNombre.get(normalizarNombreCorte(c.nombre)) || null;
      const precioVenta = producto ? Number(producto.precio_unitario) : Number(preciosNuevos[c.nombre] || 0);
      return { ...c, producto, precioVenta, incluido: !excluidos.includes(c.nombre) };
    });
    const costoTotal = Number(kgMediaRes || 0) * Number(precioKgMediaRes || 0);
    const precios = Object.fromEntries(base.map(c => [c.nombre, c.precioVenta]));
    const conCosto = asignarCostos(base, costoTotal, precios);
    return base.map((c, i) => ({ ...c, costoPorKg: conCosto[i].costoPorKg }));
  }, [resultado, inventarioPorNombre, preciosNuevos, excluidos, kgMediaRes, precioKgMediaRes]);

  const corteStockPorNombre = useMemo(() => new Map(cortes.map(c => [c.nombre, c])), [cortes]);

  const aCargar = cortes.filter(c => c.incluido);
  const faltanPrecios = aCargar.filter(c => !c.producto && !(Number(preciosNuevos[c.nombre]) > 0));
  const kgACargar = aCargar.reduce((acc, c) => acc + c.kg, 0);
  const hayCosto = Number(precioKgMediaRes) > 0;

  const toggleSubgrupo = (id) => {
    setSubgruposActivos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleExcluido = (nombre) => {
    setExcluidos(prev => prev.includes(nombre) ? prev.filter(x => x !== nombre) : [...prev, nombre]);
  };

  const handleSumarAlStock = async () => {
    setMensaje(null);
    if (faltanPrecios.length > 0) {
      setMensaje({ type: 'error', text: `Cargá el precio de venta por kg de los cortes nuevos: ${faltanPrecios.map(c => c.nombre).join(', ')}.` });
      return;
    }

    setGuardando(true);
    try {
      for (const c of aCargar) {
        if (c.producto) {
          await updateMercaderia(c.producto.id, {
            cantidad: Number(c.producto.cantidad || 0) + c.kg
          });
        } else {
          await addMercaderia({
            nombre: c.nombre,
            cantidad: c.kg,
            unidad_medida: 'kg',
            precio_unitario: Number(preciosNuevos[c.nombre]),
            categoria: 'Cortes Vacunos'
          }, tenantId);
        }
      }
      setMensaje({ type: 'success', text: `Listo: se sumaron ${fmtKg(kgACargar)} kg de ${aCargar.length} cortes al inventario.` });
      setKgMediaRes('');
      setPrecioKgMediaRes('');
      setExcluidos([]);
      setPreciosNuevos({});
      recargarInventario();
    } catch (err) {
      console.error('Error al sumar el desposte al stock:', err);
      setMensaje({ type: 'error', text: `No se pudo completar la carga (puede haber quedado a medias, revisá Inventario): ${err.message || err}` });
      recargarInventario();
    } finally {
      setGuardando(false);
    }
  };

  // Una fila de la tabla para un corte que va (o puede ir) al stock.
  const renderFilaStock = (nombre, kg, porcentaje, { sangria = false } = {}) => {
    const c = corteStockPorNombre.get(nombre);
    const incluido = c ? c.incluido : false;
    return (
      <tr key={`${nombre}-${sangria}`} style={{ opacity: incluido ? 1 : 0.45 }}>
        <td style={tdStyle}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingLeft: sangria ? '24px' : 0 }}>
            <input type="checkbox" checked={incluido} onChange={() => toggleExcluido(nombre)} />
            <span style={{ fontWeight: sangria ? 500 : 600 }}>{sangria ? '↳ ' : ''}{nombre}</span>
          </label>
        </td>
        <td style={numStyle}>{fmtPct(porcentaje)}</td>
        <td style={{ ...numStyle, fontWeight: 700 }}>{fmtKg(kg)}</td>
        <td style={numStyle}>
          {c?.producto ? (
            <span title="Precio de venta actual en Inventario">{fmtPesos(c.precioVenta)}</span>
          ) : (
            <input
              type="number"
              min="0"
              className="input-field"
              placeholder="Precio venta"
              value={preciosNuevos[nombre] || ''}
              onChange={e => setPreciosNuevos(prev => ({ ...prev, [nombre]: e.target.value }))}
              style={{ width: '120px', padding: '6px 8px', textAlign: 'right', marginLeft: 'auto' }}
              title="Este corte no está en tu inventario: se crea con este precio de venta por kg"
            />
          )}
        </td>
        {hayCosto && <td style={numStyle}>{fmtPesos(c?.costoPorKg)}</td>}
      </tr>
    );
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Beef size={32} /> Desposte de Media Res
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Cargá los kilos de la media res que compraste y te calculamos cuántos kg de cada corte vas a obtener.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={20} /> Datos de la media res
          </h2>
          <div className="input-group">
            <label className="input-label">Peso de la media res (kg) *</label>
            <input type="number" min="0" step="0.001" className="input-field" placeholder="Ej: 97" value={kgMediaRes} onChange={e => setKgMediaRes(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Precio pagado por kg (opcional)</label>
            <input type="number" min="0" step="0.01" className="input-field" placeholder="Ej: 5200" value={precioKgMediaRes} onChange={e => setPrecioKgMediaRes(e.target.value)} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Si lo cargás, calculamos el costo por kg de cada corte.</span>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Rendimiento de la media res (%)</label>
            <input type="number" min="1" max="100" step="0.01" className="input-field" value={rendimientoPct} onChange={e => setRendimientoPct(e.target.value)} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Kilos que quedan como carne después del desposte. Promedio de referencia: {(RENDIMIENTO_MEDIA_RES * 100).toFixed(2)}%.
            </span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} /> Subcortes
          </h2>
          {SUBGRUPOS_MEDIA_RES.map(sg => {
            const configurado = subgrupoConfigurado(sg);
            return (
              <label key={sg.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '14px', cursor: configurado ? 'pointer' : 'not-allowed', opacity: configurado ? 1 : 0.55 }}>
                <input type="checkbox" disabled={!configurado} checked={configurado && subgruposActivos.includes(sg.id)} onChange={() => toggleSubgrupo(sg.id)} style={{ marginTop: '4px' }} />
                <span>
                  <span style={{ fontWeight: 600, display: 'block' }}>{sg.nombre}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {configurado
                      ? sg.salidas.map(s => `${s.nombre} ${Math.round(s.factor * 1000) / 10}%`).join(' · ')
                      : 'Pendiente: falta el rendimiento de ' + sg.salidas.filter(s => s.factor == null).map(s => s.nombre.toLowerCase()).join(', ')}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {resultado.kgMediaRes > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Media res', valor: `${fmtKg(resultado.kgMediaRes)} kg` },
              { label: 'Carne aprovechable', valor: `${fmtKg(resultado.kgAprovechable)} kg`, nota: fmtPct(Number(rendimientoPct)) },
              { label: 'Hueso, grasa y recorte', valor: `${fmtKg(resultado.kgDesperdicio)} kg`, nota: fmtPct(100 - Number(rendimientoPct)) },
              { label: 'Pérdida de subcortes', valor: `${fmtKg(resultado.perdidaSecundariaKg)} kg` },
              ...(hayCosto ? [{ label: 'Costo de la media res', valor: fmtPesos(resultado.kgMediaRes * Number(precioKgMediaRes)) }] : [])
            ].map(card => (
              <div key={card.label} className="glass-panel" style={{ padding: '18px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{card.label}</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{card.valor}</p>
                {card.nota && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{card.nota} de la media res</p>}
              </div>
            ))}
          </div>

          <div className="glass-panel" style={{ overflowX: 'auto', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Corte (sumar al stock)</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>% media res</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Kg</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Precio venta /kg</th>
                  {hayCosto && <th style={{ ...thStyle, textAlign: 'right' }}>Costo /kg</th>}
                </tr>
              </thead>
              <tbody>
                {resultado.filas.map(f => {
                  if (!f.subgrupo) return renderFilaStock(f.nombre, f.kg, f.porcentajeMediaRes);
                  // Corte que pasa a un subgrupo: se muestra como referencia y
                  // debajo lo que efectivamente va al stock.
                  return [
                    <tr key={f.nombre} style={{ color: 'var(--text-secondary)' }}>
                      <td style={tdStyle}><span style={{ paddingLeft: '26px' }}>{f.nombre} <em style={{ fontSize: '0.8rem' }}>(se desposta)</em></span></td>
                      <td style={numStyle}>{fmtPct(f.porcentajeMediaRes)}</td>
                      <td style={numStyle}>{fmtKg(f.kg)}</td>
                      <td style={tdStyle}></td>
                      {hayCosto && <td style={tdStyle}></td>}
                    </tr>,
                    ...(f.subcortes || []).map(s => renderFilaStock(s.nombre, s.kg, s.porcentajeMediaRes, { sangria: true })),
                    ...(f.subcortes && f.perdidaKg > 0 ? [
                      <tr key={`${f.nombre}-perdida`} style={{ color: 'var(--danger)' }}>
                        <td style={tdStyle}><span style={{ paddingLeft: '50px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Trash2 size={14} /> Pérdida del subcorte</span></td>
                        <td style={tdStyle}></td>
                        <td style={numStyle}>{fmtKg(f.perdidaKg)}</td>
                        <td style={tdStyle}></td>
                        {hayCosto && <td style={tdStyle}></td>}
                      </tr>
                    ] : [])
                  ];
                })}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Los kg son una estimación según la tabla promedio de desposte. El precio de venta de los cortes que ya tenés en Inventario no se modifica.
            {hayCosto && ' El costo por kg se reparte según el valor de venta de cada corte: los cortes más caros absorben más costo.'}
          </p>

          {mensaje && (
            <div style={{
              marginBottom: '16px', padding: '12px', borderRadius: '6px', display: 'flex', gap: '8px', alignItems: 'center',
              border: `1px solid ${mensaje.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
              color: mensaje.type === 'success' ? 'var(--success)' : 'var(--danger)'
            }}>
              {mensaje.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {mensaje.text}
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSumarAlStock}
            disabled={guardando || aCargar.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 22px' }}
          >
            <PackagePlus size={18} />
            {guardando ? 'Sumando al stock...' : `Sumar ${fmtKg(kgACargar)} kg al stock`}
          </button>
        </>
      )}

      {mensaje && resultado.kgMediaRes === 0 && (
        <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--success)', color: 'var(--success)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <CheckCircle2 size={18} /> {mensaje.text}
        </div>
      )}
    </div>
  );
}
