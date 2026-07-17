import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { createCliente, getAllClientes } from '../services/clientesApi';
import FacturaPDF from '../components/FacturaPDF';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { 
  Receipt, Search, Calendar, CheckCircle2, AlertCircle, 
  Loader2, Filter, Eye, DollarSign, Download, Printer, UserPlus
} from 'lucide-react';

const CONDICION_IVA_OPTIONS = [
  { value: 'CF', label: 'Consumidor Final' },
  { value: 'RI', label: 'Responsable Inscripto' },
  { value: 'Mono', label: 'Monotributista' },
  { value: 'EX', label: 'Exento' }
];

const DOC_TIPO_OPTIONS = [
  { value: 99, label: 'Sin Identificar (Consumidor Final)' },
  { value: 96, label: 'DNI' },
  { value: 80, label: 'CUIT' }
];

export default function Facturacion() {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFiscal, setFilterFiscal] = useState('ALL'); // ALL, PENDING, FISCAL
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Estados del modal de emisión
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [tipoFactura, setTipoFactura] = useState('B'); // A o B
  const [alicuota, setAlicuota] = useState(21); // 21 o 10.5
  const [fechaCbte, setFechaCbte] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [procesandoEmision, setProcesandoEmision] = useState(false);
  const [errorEmision, setErrorEmision] = useState('');

  // Formulario nuevo cliente
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    email: '',
    telefono: '',
    cuit: '',
    doc_tipo: 99,
    doc_nro: '0',
    condicion_iva: 'CF'
  });

  // Estado del visualizador PDF
  const [pdfFacturaActiva, setPdfFacturaActiva] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      // Obtener todos los pedidos pagados
      let query = supabase
        .from('pedidos')
        .select(`
          *,
          clientes (
            id, nombre, email, cuit, doc_tipo, doc_nro, condicion_iva
          ),
          items_pedido (*)
        `)
        .eq('estado', 'Pagado')
        .order('fecha_cobro', { ascending: false });

      const { data: pedidosData, error: errorPedidos } = await query;
      if (errorPedidos) throw errorPedidos;

      setPedidos(pedidosData || []);

      // Obtener clientes
      const cls = await getAllClientes();
      setClientes(cls || []);
    } catch (err) {
      console.error("Error al cargar datos de facturación:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleOpenEmision = (pedido) => {
    setSelectedPedido(pedido);
    setTipoFactura(pedido.clientes?.condicion_iva === 'RI' ? 'A' : 'B');
    setAlicuota(21);
    setFechaCbte(new Date().toISOString().split('T')[0]);
    setSelectedCliente(pedido.clientes || null);
    setErrorEmision('');
  };

  const handleCloseEmision = () => {
    setSelectedPedido(null);
    setSelectedCliente(null);
    setShowNuevoCliente(false);
  };

  const handleCrearCliente = async (e) => {
    e.preventDefault();
    if (!nuevoCliente.nombre.trim()) return;

    try {
      setProcesandoEmision(true);
      const res = await createCliente(nuevoCliente);
      setSelectedCliente(res);
      // Actualizar listado de clientes
      const cls = await getAllClientes();
      setClientes(cls || []);
      setShowNuevoCliente(false);
      // Limpiar form
      setNuevoCliente({
        nombre: '',
        email: '',
        telefono: '',
        cuit: '',
        doc_tipo: 99,
        doc_nro: '0',
        condicion_iva: 'CF'
      });
    } catch (err) {
      console.error(err);
      setErrorEmision('Error al registrar el cliente');
    } finally {
      setProcesandoEmision(false);
    }
  };

  const emitirFacturaARCA = async () => {
    if (!selectedPedido) return;
    setProcesandoEmision(true);
    setErrorEmision('');

    // Preparar payload para API
    const condicionMap = {
      'RI': 1,
      'CF': 5,
      'Mono': 6,
      'EX': 4
    };

    const condicionIVAReceptor = condicionMap[selectedCliente?.condicion_iva || 'CF'] ?? 5;
    const docTipo = selectedCliente ? Number(selectedCliente.doc_tipo) : 99;
    const docNro = selectedCliente ? selectedCliente.doc_nro : '0';

    const payload = {
      pedidoId: selectedPedido.id,
      tipoCbte: tipoFactura === 'A' ? 1 : 6,
      condicionIVAReceptor,
      docTipo,
      docNro,
      importeTotal: selectedPedido.total,
      concepto: 1, // Productos
      descripcion: `Venta Mostrador - Pedido #${selectedPedido.id.substring(0, 8)}`,
      fechaCbte,
      alicuotaIVA: alicuota === 21 ? 5 : 4 // 5 = 21%, 4 = 10.5% en AFIP
    };

    try {
      const response = await fetch('/api/arca/emitir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || 'Error al emitir factura electrónica.');
      }

      // Éxito
      cargarDatos();
      handleCloseEmision();
    } catch (err) {
      console.error(err);
      setErrorEmision(err.message || 'Ocurrió un error al procesar el comprobante.');
    } finally {
      setProcesandoEmision(false);
    }
  };

  const getDesglose = (total, tipo, ali) => {
    if (tipo === 'B') {
      const factor = 1 + ali / 100;
      const neto = +(total / factor).toFixed(2);
      const iva = +(total - neto).toFixed(2);
      return { neto, iva, total };
    } else {
      const neto = total;
      const iva = +(total * (ali / 100)).toFixed(2);
      const finalTotal = +(neto + iva).toFixed(2);
      return { neto, iva, total: finalTotal };
    }
  };

  // Filtrado de pedidos
  const filteredPedidos = pedidos.filter(p => {
    const isFiscalMatch = 
      filterFiscal === 'ALL' ||
      (filterFiscal === 'FISCAL' && p.is_fiscal) ||
      (filterFiscal === 'PENDING' && !p.is_fiscal);

    const clientName = p.clientes?.nombre || 'Consumidor Final';
    const notesMatch = p.notas ? p.notas.toLowerCase().includes(search.toLowerCase()) : false;
    const searchMatch = 
      search === '' || 
      clientName.toLowerCase().includes(search.toLowerCase()) || 
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      (p.voucher_number && p.voucher_number.toLowerCase().includes(search.toLowerCase())) ||
      notesMatch;

    const dateMatch = 
      (!dateFrom || new Date(p.fecha_cobro) >= new Date(dateFrom)) &&
      (!dateTo || new Date(p.fecha_cobro) <= new Date(dateTo + 'T23:59:59'));

    return isFiscalMatch && searchMatch && dateMatch;
  });

  // Estadísticas
  const totalFacturadoFiscal = pedidos
    .filter(p => p.is_fiscal)
    .reduce((acc, curr) => acc + curr.total, 0);

  const totalPendienteFiscal = pedidos
    .filter(p => !p.is_fiscal)
    .reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Receipt size={32} color="var(--accent-primary)" /> Facturación Electrónica ARCA
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Administra las ventas realizadas en Market y emite facturas A y B con validez fiscal.</p>
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(74, 124, 89, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              ${totalFacturadoFiscal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Facturado en ARCA
            </p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(197, 160, 89, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
            <Receipt size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              ${totalPendienteFiscal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pendiente de Facturar
            </p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(44, 44, 44, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} color="var(--success)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {pedidos.filter(p => p.is_fiscal).length} / {pedidos.length}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Ventas Fiscalizadas
            </p>
          </div>
        </div>
      </div>

      {/* Panel de Filtros */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: 1, minWidth: '260px', marginBottom: 0 }}>
            <label className="input-label">Buscar Venta</label>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Cliente, CUIT, N° comprobante o Pedido ID..." 
                style={{ paddingLeft: '40px' }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group" style={{ width: '180px', marginBottom: 0 }}>
            <label className="input-label">Estado Fiscal</label>
            <select 
              className="input-field"
              value={filterFiscal}
              onChange={e => setFilterFiscal(e.target.value)}
            >
              <option value="ALL">Todas las ventas</option>
              <option value="PENDING">Pendientes de Factura</option>
              <option value="FISCAL">Emitidas (Fiscales)</option>
            </select>
          </div>

          <div className="input-group" style={{ width: '160px', marginBottom: 0 }}>
            <label className="input-label">Desde</label>
            <input 
              type="date" 
              className="input-field" 
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ width: '160px', marginBottom: 0 }}>
            <label className="input-label">Hasta</label>
            <input 
              type="date" 
              className="input-field" 
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Listado de Pedidos */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: '20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '10px' }}>
            <Loader2 className="animate-spin" size={32} color="var(--accent-primary)" />
            <p style={{ color: 'var(--text-secondary)' }}>Cargando ventas y facturas...</p>
          </div>
        ) : filteredPedidos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            No se encontraron ventas para facturar con los filtros aplicados.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(197, 160, 89, 0.15)', textAlign: 'left', fontWeight: 'bold' }}>
                <th style={{ padding: '12px' }}>ID / Comprobante</th>
                <th style={{ padding: '12px' }}>Fecha</th>
                <th style={{ padding: '12px' }}>Cliente</th>
                <th style={{ padding: '12px' }}>Medio Pago</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Estado Fiscal</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPedidos.map(pedido => (
                <tr key={pedido.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', verticalAlign: 'middle' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                    {pedido.is_fiscal ? (
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {pedido.voucher_type} {pedido.voucher_number}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        ID #{pedido.id.substring(0, 8)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {new Date(pedido.fecha_cobro || pedido.created_at).toLocaleDateString('es-AR', {
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{pedido.clientes?.nombre || 'Consumidor Final'}</div>
                      {pedido.clientes?.cuit && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CUIT: {pedido.clientes.cuit}</div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px', textTransform: 'capitalize' }}>
                    {pedido.medio_pago?.replace(/_/g, ' ') || 'S/D'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                    ${pedido.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {pedido.is_fiscal ? (
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                        backgroundColor: 'rgba(74, 124, 89, 0.15)', color: 'var(--success)'
                      }}>
                        EMITIDO (CAE)
                      </span>
                    ) : (
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                        backgroundColor: 'rgba(197, 160, 89, 0.15)', color: 'var(--accent-hover)'
                      }}>
                        PENDIENTE
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {pedido.is_fiscal ? (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => {
                            // Mapear campos de pedido a la estructura del PDF
                            const facturaData = {
                              tipo_cbte: pedido.voucher_type === 'FA' ? 1 : 6,
                              nro_cbte: parseInt(pedido.voucher_number.split('-')[1], 10),
                              punto_venta: parseInt(pedido.voucher_number.split('-')[0], 10),
                              fecha_cbte: (pedido.fecha_cobro || pedido.created_at).split('T')[0],
                              imp_total: pedido.total,
                              imp_neto: +(pedido.total / (1 + (pedido.alicuota_iva || 21)/100)).toFixed(2),
                              imp_iva: +(pedido.total - (pedido.total / (1 + (pedido.alicuota_iva || 21)/100))).toFixed(2),
                              cae: pedido.cae_number,
                              cae_fch_vto: pedido.cae_expiration,
                              receptor_nombre: pedido.clientes?.nombre || 'Consumidor Final',
                              doc_nro: pedido.clientes?.doc_nro || '0',
                              condicion_iva_receptor: pedido.clientes?.condicion_iva === 'RI' ? 1 : 5,
                              items: pedido.items_pedido?.map(it => ({
                                descripcion: it.producto_nombre,
                                cantidad: it.cantidad,
                                precio_unitario: it.precio_unitario
                              })) || []
                            };
                            setPdfFacturaActiva(facturaData);
                          }}
                        >
                          <Eye size={14} /> Ver PDF
                        </button>
                      ) : (
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => handleOpenEmision(pedido)}
                        >
                          Emitir FC
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Checkout Fiscal (Emisión) */}
      {selectedPedido && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-panel" style={{
            backgroundColor: 'var(--panel-bg)', width: '100%', maxWidth: '600px',
            padding: '24px', position: 'relative', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
              Emisión de Comprobante Fiscal
            </h2>

            {errorEmision && (
              <div style={{
                backgroundColor: 'rgba(183, 65, 52, 0.1)', color: 'var(--danger)',
                padding: '12px', borderRadius: '4px', marginBottom: '20px',
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem'
              }}>
                <AlertCircle size={18} />
                <span>{errorEmision}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Tipo Factura</label>
                <select 
                  className="input-field" 
                  value={tipoFactura}
                  onChange={e => setTipoFactura(e.target.value)}
                  disabled={selectedCliente?.condicion_iva === 'RI'} // Fuerza Factura A si es RI
                >
                  <option value="B">Factura B</option>
                  <option value="A">Factura A</option>
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Alícuota IVA</label>
                <select 
                  className="input-field"
                  value={alicuota}
                  onChange={e => setAlicuota(Number(e.target.value))}
                >
                  <option value={21}>21%</option>
                  <option value={10.5}>10.5%</option>
                </select>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '16px' }}>
              <label className="input-label">Fecha del Comprobante</label>
              <input 
                type="date" 
                className="input-field"
                value={fechaCbte}
                onChange={e => setFechaCbte(e.target.value)}
              />
            </div>

            {/* Asignación de Cliente */}
            <div style={{ border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>Cliente / Receptor</h4>
                {!showNuevoCliente && (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    onClick={() => setShowNuevoCliente(true)}
                  >
                    <UserPlus size={12} /> Nuevo Cliente
                  </button>
                )}
              </div>

              {showNuevoCliente ? (
                <form onSubmit={handleCrearCliente} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Nombre / Razón Social</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Ej. Juan Pérez"
                      required
                      value={nuevoCliente.nombre}
                      onChange={e => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Condición IVA</label>
                      <select 
                        className="input-field"
                        value={nuevoCliente.condicion_iva}
                        onChange={e => setNuevoCliente({...nuevoCliente, condicion_iva: e.target.value})}
                      >
                        {CONDICION_IVA_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Tipo Documento</label>
                      <select 
                        className="input-field"
                        value={nuevoCliente.doc_tipo}
                        onChange={e => setNuevoCliente({...nuevoCliente, doc_tipo: Number(e.target.value)})}
                      >
                        {DOC_TIPO_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">N° Documento / CUIT</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="Solo números"
                        value={nuevoCliente.doc_nro}
                        onChange={e => setNuevoCliente({
                          ...nuevoCliente, 
                          doc_nro: e.target.value,
                          cuit: nuevoCliente.doc_tipo === 80 ? e.target.value : nuevoCliente.cuit
                        })}
                      />
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Email</label>
                      <input 
                        type="email" 
                        className="input-field" 
                        placeholder="correo@ejemplo.com"
                        value={nuevoCliente.email}
                        onChange={e => setNuevoCliente({...nuevoCliente, email: e.target.value})}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                      disabled={procesandoEmision}
                    >
                      Registrar Cliente
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                      onClick={() => setShowNuevoCliente(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="input-group" style={{ marginBottom: '10px' }}>
                    <label className="input-label">Seleccionar Cliente Existente</label>
                    <select 
                      className="input-field"
                      value={selectedCliente?.id || ''}
                      onChange={e => {
                        const cl = clientes.find(c => c.id === e.target.value);
                        setSelectedCliente(cl || null);
                        if (cl?.condicion_iva === 'RI') {
                          setTipoFactura('A');
                        }
                      }}
                    >
                      <option value="">Consumidor Final (Sin Identificar)</option>
                      {clientes.map(cl => (
                        <option key={cl.id} value={cl.id}>
                          {cl.nombre} - CUIT/Doc: {cl.doc_nro} ({cl.condicion_iva})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCliente && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '4px' }}>
                      <strong>{selectedCliente.nombre}</strong><br />
                      Condición IVA: {selectedCliente.condicion_iva} | CUIT/DNI: {selectedCliente.doc_nro}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desglose de Importes */}
            {(() => {
              const { neto, iva, total } = getDesglose(selectedPedido.total, tipoFactura, alicuota);
              return (
                <div style={{
                  backgroundColor: 'rgba(197, 160, 89, 0.05)', border: '1px solid var(--accent-primary)',
                  padding: '16px', borderRadius: '4px', marginBottom: '24px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', borderBottom: '1px solid rgba(197, 160, 89, 0.2)', paddingBottom: '6px' }}>
                    Desglose de Impuestos
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                    <span>Importe Neto:</span>
                    <span style={{ fontWeight: 'bold' }}>${neto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                    <span>IVA ({alicuota}%):</span>
                    <span style={{ fontWeight: 'bold' }}>${iva.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '6px', marginTop: '6px' }}>
                    <span>Total a Facturar:</span>
                    <span style={{ color: 'var(--accent-hover)' }}>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 2 }}
                disabled={procesandoEmision || (tipoFactura === 'A' && (!selectedCliente || selectedCliente.condicion_iva !== 'RI'))}
                onClick={emitirFacturaARCA}
              >
                {procesandoEmision ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Emitiendo...
                  </>
                ) : 'Emitir Factura Electrónica'}
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={handleCloseEmision}
                disabled={procesandoEmision}
              >
                Cancelar
              </button>
            </div>
            
            {tipoFactura === 'A' && (!selectedCliente || selectedCliente.condicion_iva !== 'RI') && (
              <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '8px', textAlign: 'center' }}>
                * Factura A requiere seleccionar un cliente Responsable Inscripto con CUIT.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal Visualizador PDF */}
      {pdfFacturaActiva && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-panel" style={{
            backgroundColor: 'var(--panel-bg)', width: '90%', maxWidth: '850px',
            padding: '24px', position: 'relative', height: '90vh', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>
                Vista Previa de Comprobante Fiscal
              </h2>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px' }}
                onClick={() => setPdfFacturaActiva(null)}
              >
                Cerrar
              </button>
            </div>

            <div style={{ flex: 1, border: '1px solid var(--glass-border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
              <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
                <FacturaPDF 
                  factura={pdfFacturaActiva} 
                  qrCodeBase64="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkAQAAAAD8ee4vAAAAU0lEQVR42mP4DwUMDP8P4A8E/gf4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4F8d2bHn/z0VpAAAAABJRU5ErkJggg==" 
                />
              </PDFViewer>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <PDFDownloadLink
                document={
                  <FacturaPDF 
                    factura={pdfFacturaActiva} 
                    qrCodeBase64="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkAQAAAAD8ee4vAAAAU0lEQVR42mP4DwUMDP8P4A8E/gf4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4D/Af4F8d2bHn/z0VpAAAAABJRU5ErkJggg==" 
                  />
                }
                fileName={`Factura_${pdfFacturaActiva.tipo_cbte === 1 ? 'A' : 'B'}_${String(pdfFacturaActiva.punto_venta).padStart(4, '0')}-${String(pdfFacturaActiva.nro_cbte).padStart(8, '0')}.pdf`}
                style={{ textDecoration: 'none' }}
              >
                {({ loading: pdfLoading }) => (
                  <button className="btn btn-primary" disabled={pdfLoading}>
                    <Download size={16} /> {pdfLoading ? 'Generando...' : 'Descargar PDF'}
                  </button>
                )}
              </PDFDownloadLink>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
