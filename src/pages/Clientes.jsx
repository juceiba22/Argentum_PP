import React, { useState } from 'react';
import { Plus, Search, ChevronDown, ChevronUp, Package, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { createCliente, getClienteById, getPedidosByClienteId, getAllClientes } from '../services/clientesApi';
import { useActivity } from '../context/ActivityContext';
import { useEffect } from 'react';

export default function Clientes() {
  const { logCliente } = useActivity();
  // Crear Cliente State
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', email: '', telefono: '' });
  const [creando, setCreando] = useState(false);
  const [clienteCreadoId, setClienteCreadoId] = useState(null);
  const [errorCrear, setErrorCrear] = useState('');

  // Buscar Cliente State
  const [searchId, setSearchId] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [pedidosCliente, setPedidosCliente] = useState([]);
  const [errorBuscar, setErrorBuscar] = useState('');
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Listado de Todos los Clientes
  const [listaClientes, setListaClientes] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);

  const cargarTodos = async () => {
    setCargandoLista(true);
    try {
      const data = await getAllClientes();
      setListaClientes(data || []);
    } catch (err) {
      console.error("Error al cargar lista de clientes", err);
    } finally {
      setCargandoLista(false);
    }
  };

  useEffect(() => {
    cargarTodos();
  }, []);

  // --- Handlers para Crear Cliente ---
  const handleCrearCliente = async (e) => {
    e.preventDefault();
    setCreando(true);
    setErrorCrear('');
    setClienteCreadoId(null);

    try {
      const data = await createCliente(nuevoCliente);
      setClienteCreadoId(data.id);
      logCliente({ id: data.id, nombre: nuevoCliente.nombre, email: nuevoCliente.email });
      setNuevoCliente({ nombre: '', email: '', telefono: '' }); // Limpiar
      cargarTodos(); // Refrescar lista
    } catch (err) {
      console.error(err);
      setErrorCrear(err.message || 'Error al crear el cliente.');
    } finally {
      setCreando(false);
    }
  };

  // --- Handlers para Buscar Cliente ---
  const handleBuscarCliente = async (e) => {
    e.preventDefault();
    if (!searchId) return;
    
    setBuscando(true);
    setErrorBuscar('');
    setClienteEncontrado(null);
    setPedidosCliente([]);
    setExpandedRowId(null);

    try {
      const cliente = await getClienteById(searchId);
      if (!cliente) throw new Error("Cliente no encontrado");
      
      setClienteEncontrado(cliente);
      const pedidos = await getPedidosByClienteId(searchId);
      setPedidosCliente(pedidos || []);
    } catch (err) {
      console.error(err);
      setErrorBuscar('No se pudo encontrar ningún cliente con ese ID exacto.');
    } finally {
      setBuscando(false);
    }
  };

  const toggleRow = (id) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Gestión de Clientes</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Crea nuevos clientes y consulta su historial en la base de datos real.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* COLUMNA IZQUIERDA: CREAR CLIENTE */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} color="var(--accent-primary)" /> Nuevo Cliente
          </h2>

          <form onSubmit={handleCrearCliente}>
            <div className="input-group">
              <label className="input-label">Nombre Completo</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Ej. Juan Pérez" 
                value={nuevoCliente.nombre}
                onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                required
              />
            </div>
            
            <div className="input-group">
              <label className="input-label">Email</label>
              <input 
                type="email" 
                className="input-field" 
                placeholder="ejemplo@correo.com" 
                value={nuevoCliente.email}
                onChange={(e) => setNuevoCliente({...nuevoCliente, email: e.target.value})}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Teléfono (Opcional)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="+54 11 1234-5678" 
                value={nuevoCliente.telefono}
                onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={creando}>
              {creando ? 'Guardando...' : 'Crear Cliente'}
            </button>
          </form>

          {/* Alertas de Éxito o Error (Crear) */}
          {errorCrear && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.9rem', display: 'flex', gap: '8px' }}>
              <AlertCircle size={18} /> {errorCrear}
            </div>
          )}
          {clienteCreadoId && (
            <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '8px', color: '#6ee7b7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 600 }}>
                <CheckCircle2 size={20} /> ¡Cliente creado con éxito!
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ID Generado:</p>
              <code className="code-dark" style={{ fontSize: '0.9rem', padding: '4px 8px', borderRadius: '4px', display: 'block', marginTop: '4px', wordBreak: 'break-all' }}>
                {clienteCreadoId}
              </code>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: BUSCAR CLIENTE */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={20} color="var(--accent-primary)" /> Buscar Cliente
          </h2>

          <form onSubmit={handleBuscarCliente} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ingresa el UUID del cliente..." 
              style={{ marginBottom: 0 }}
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-secondary" disabled={buscando}>
              {buscando ? '...' : 'Cargar'}
            </button>
          </form>

          {/* Alertas de Error (Buscar) */}
          {errorBuscar && (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.9rem', display: 'flex', gap: '8px' }}>
              <AlertCircle size={18} /> {errorBuscar}
            </div>
          )}

          {/* Resultados */}
          {clienteEncontrado && (
            <div className="animate-fade-in">
              <div className="card-dark" style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                <h3 className="text-white" style={{ fontSize: '1.1rem', fontWeight: 600 }}>{clienteEncontrado.nombre}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>{clienteEncontrado.email} • {clienteEncontrado.telefono || 'Sin teléfono'}</p>
              </div>

              <h4 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Historial de Pedidos ({pedidosCliente.length})</h4>
              
              {pedidosCliente.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Este cliente aún no tiene pedidos.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pedidosCliente.map(pedido => (
                    <div key={pedido.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', overflow: 'hidden' }}>
                      {/* Fila Principal del Pedido */}
                      <div 
                        onClick={() => toggleRow(pedido.id)}
                        style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expandedRowId === pedido.id ? 'rgba(255,255,255,0.05)' : 'transparent', transition: 'background 0.2s' }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600 }}>${Number(pedido.total).toLocaleString()}</span>
                            <span className={`badge badge-${pedido.estado.toLowerCase()}`}>{pedido.estado}</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {new Date(pedido.created_at).toLocaleDateString()} • ID: {pedido.id.substring(0,8)}...
                          </div>
                        </div>
                        {expandedRowId === pedido.id ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
                      </div>

                      {/* Desglose de Ítems (Expansible) */}
                      {expandedRowId === pedido.id && (
                        <div className="card-dark" style={{ padding: '16px', borderTop: '1px solid var(--glass-border)' }}>
                          <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Package size={14} /> Ítems del Pedido
                          </h5>
                          {(!pedido.items_pedido || pedido.items_pedido.length === 0) ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No hay ítems registrados.</p>
                          ) : (
                            <div className="table-responsive">
                              <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <th style={{ paddingBottom: '8px', fontWeight: 500 }}>Producto</th>
                                    <th style={{ paddingBottom: '8px', fontWeight: 500 }}>Cant.</th>
                                    <th style={{ paddingBottom: '8px', fontWeight: 500 }}>Precio U.</th>
                                    <th style={{ paddingBottom: '8px', fontWeight: 500 }}>Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pedido.items_pedido.map(item => (
                                    <tr key={item.id}>
                                      <td style={{ paddingTop: '8px' }}>{item.producto_nombre}</td>
                                      <td style={{ paddingTop: '8px', color: 'var(--text-secondary)' }}>x{item.cantidad}</td>
                                      <td style={{ paddingTop: '8px', color: 'var(--text-secondary)' }}>${Number(item.precio_unitario).toLocaleString()}</td>
                                      <td style={{ paddingTop: '8px', fontWeight: 600 }}>${Number(item.subtotal).toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* LISTADO COMPLETO DE CLIENTES */}
      <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={20} color="var(--accent-primary)" /> Directorio de Clientes
        </h2>
        
        {cargandoLista ? (
          <p style={{ color: 'var(--text-secondary)' }}>Cargando directorio...</p>
        ) : listaClientes.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No hay clientes registrados en la base de datos.</p>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', fontSize: '0.9rem', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Nombre</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Teléfono</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>UUID</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listaClientes.map(cliente => (
                  <tr key={cliente.id} style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '16px', fontWeight: 500 }}>{cliente.nombre}</td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{cliente.email}</td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{cliente.telefono || '-'}</td>
                    <td style={{ padding: '16px' }}>
                      <code className="code-dark" style={{ fontSize: '0.8rem', padding: '2px 6px', borderRadius: '4px' }}>
                        {cliente.id.substring(0,8)}...
                      </code>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button 
                        onClick={() => {
                          setSearchId(cliente.id);
                          // Simulamos el submit del form de busqueda
                          handleBuscarCliente({ preventDefault: () => {} });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} 
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Ver Detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
