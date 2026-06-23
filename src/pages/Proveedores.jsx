import React, { useEffect, useState } from 'react';
import { Truck, Plus, Trash2, Edit2, Mail, Phone, MapPin } from 'lucide-react';
import { getProveedores, createProveedor, deleteProveedor, updateProveedor } from '../services/erpApi';

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  
  const [formData, setFormData] = useState({ nombre: '', cuit: '', telefono: '', email: '', direccion: '' });
  
  const fetchProveedores = async () => {
    setLoading(true);
    try {
      const data = await getProveedores();
      setProveedores(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProveedores();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre) return;
    setProcesando(true);
    try {
      await createProveedor({ ...formData, activo: true });
      setFormData({ nombre: '', cuit: '', telefono: '', email: '', direccion: '' });
      fetchProveedores();
    } catch (e) {
      console.error(e);
      alert('Error guardando proveedor');
    } finally {
      setProcesando(false);
    }
  };

  const handleEliminar = async (id) => {
    if(window.confirm('¿Eliminar proveedor? Esta acción fallará si el proveedor tiene compras asociadas (protección referencial).')) {
      try {
        await deleteProveedor(id);
        fetchProveedores();
      } catch(e) {
        console.error(e);
        alert('No se pudo eliminar el proveedor. Es probable que tenga compras asociadas.');
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Alta Proveedores</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Módulo Gestión de proveedores</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>
        
        {/* Formulario Lateral */}
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} color="var(--accent-primary)" /> Nuevo Proveedor
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Razón Social / Nombre *</label>
              <input name="nombre" value={formData.nombre} onChange={handleChange} className="input-field" placeholder="Ej. Frigorífico XYZ" required />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">CUIT / DNI</label>
              <input name="cuit" value={formData.cuit} onChange={handleChange} className="input-field" placeholder="XX-XXXXXXXX-X" />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Teléfono</label>
              <input name="telefono" value={formData.telefono} onChange={handleChange} className="input-field" placeholder="+54 9 11..." />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} className="input-field" placeholder="contacto@ejemplo.com" />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Dirección</label>
              <input name="direccion" value={formData.direccion} onChange={handleChange} className="input-field" placeholder="Calle 123..." />
            </div>
            <button type="submit" className="btn btn-primary" disabled={procesando || !formData.nombre} style={{ marginTop: '8px' }}>
              {procesando ? 'Guardando...' : 'Guardar Proveedor'}
            </button>
          </form>
        </div>

        {/* Lista de Proveedores */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={20} color="var(--text-primary)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Proveedores Registrados</h3>
          </div>
          
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)' }}>
                  <th>Razón Social / CUIT</th>
                  <th>Contacto</th>
                  <th>Dirección</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando proveedores...</td></tr>
                ) : proveedores.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay proveedores registrados.</td></tr>
                ) : (
                  proveedores.map(prov => (
                    <tr key={prov.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{prov.nombre}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{prov.cuit || 'Sin CUIT'}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem' }}>
                          {prov.telefono && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={14} /> {prov.telefono}</span>}
                          {prov.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={14} /> {prov.email}</span>}
                          {!prov.telefono && !prov.email && <span style={{ color: 'var(--text-secondary)' }}>Sin contacto</span>}
                        </div>
                      </td>
                      <td>
                        {prov.direccion ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}><MapPin size={14} /> {prov.direccion}</span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>N/A</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => handleEliminar(prov.id)} style={{ background: 'rgba(183, 65, 52, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
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
