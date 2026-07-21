import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getImportaciones, uploadImportacionFile, createImportacionRecord } from '../services/importacionesApi';

export default function Importaciones() {
  const { user } = useAuth();
  const [importaciones, setImportaciones] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const fetchImportaciones = async () => {
    if (!user) return;
    try {
      const data = await getImportaciones(user.id);
      setImportaciones(data || []);
    } catch (err) {
      console.error('Error fetching importaciones:', err);
    }
  };

  useEffect(() => {
    fetchImportaciones();
  }, [user]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateAndProcessFile = async (file) => {
    setError('');
    setSuccess('');
    
    if (!file) return;

    const allowedExtensions = ['csv', 'xlsx', 'xls', 'pdf'];
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      setError(`Tipo de archivo no permitido. Solo se aceptan: ${allowedExtensions.join(', ')}`);
      return;
    }

    setUploading(true);
    try {
      const ruta_storage = await uploadImportacionFile(file, user.id);
      
      const nuevaImportacion = {
        usuario_id: user.id,
        nombre_archivo: file.name,
        tipo_archivo: fileExt.toUpperCase(),
        ruta_storage,
        tamano: file.size,
        estado: 'Pendiente'
      };

      await createImportacionRecord(nuevaImportacion);
      setSuccess('Archivo subido exitosamente. Estado: Pendiente.');
      fetchImportaciones();
    } catch (err) {
      console.error('Error al subir archivo:', err);
      setError('Ocurrió un error al subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  const getStatusIcon = (estado) => {
    switch(estado) {
      case 'Pendiente': return <Clock size={20} style={{ color: 'var(--warning)' }} />;
      case 'Procesando': return <Loader2 size={20} className="animate-spin" style={{ color: '#3b82f6' }} />;
      case 'Procesado': return <CheckCircle size={20} style={{ color: 'var(--success)' }} />;
      case 'Error': return <AlertCircle size={20} style={{ color: 'var(--danger)' }} />;
      default: return <Clock size={20} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  const getBadgeClass = (estado) => {
    switch(estado) {
      case 'Pendiente': return 'badge-pendiente';
      case 'Procesando': return 'badge-enviado';
      case 'Procesado': return 'badge-pagado';
      case 'Error': return 'badge-cancelado';
      default: return 'badge-pendiente';
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Importaciones Bancarias</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
          Suba extractos bancarios para ser procesados posteriormente.
        </p>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(183, 65, 52, 0.1)', color: 'var(--danger)',
          padding: '16px', borderRadius: '4px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem',
          border: '1px solid rgba(183, 65, 52, 0.2)'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: 'rgba(74, 124, 89, 0.1)', color: 'var(--success)',
          padding: '16px', borderRadius: '4px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem',
          border: '1px solid rgba(74, 124, 89, 0.2)'
        }}>
          <CheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}

      <div 
        className="glass-panel"
        style={{
          padding: '48px 32px', 
          textAlign: 'center', 
          transition: 'all 0.3s ease',
          border: isDragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--glass-border)',
          backgroundColor: isDragging ? 'rgba(197, 160, 89, 0.03)' : 'var(--panel-bg)',
          marginBottom: '48px',
          cursor: 'pointer'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerSelect}
      >
        <UploadCloud size={64} style={{ color: isDragging ? 'var(--accent-primary)' : 'var(--text-secondary)', margin: '0 auto 16px auto', transition: 'color 0.3s' }} />
        <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Arrastre y suelte su archivo aquí</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>o haga clic para seleccionarlo desde su computadora</p>
        
        <button 
          onClick={(e) => { e.stopPropagation(); triggerSelect(); }}
          disabled={uploading}
          className="btn btn-primary"
        >
          {uploading ? 'Subiendo...' : 'Seleccionar Archivo'}
        </button>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
          accept=".csv,.xlsx,.xls,.pdf"
        />
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '20px', letterSpacing: '0.5px' }}>
          TIPOS PERMITIDOS: CSV, XLSX, XLS, PDF
        </p>
      </div>

      <div>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
          Historial de Importaciones
        </h3>
        
        {importaciones.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '20px 0' }}>
            No hay importaciones registradas.
          </p>
        ) : (
          <div className="table-responsive glass-panel">
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th style={{ textAlign: 'center' }}>Tamaño</th>
                  <th style={{ textAlign: 'center' }}>Fecha</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {importaciones.map((imp) => (
                  <tr key={imp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FileText size={20} style={{ color: 'var(--text-secondary)' }} />
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{imp.nombre_archivo}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>
                            {imp.tipo_archivo}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {formatBytes(imp.tamano)}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {new Date(imp.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {getStatusIcon(imp.estado)}
                        <span className={`badge ${getBadgeClass(imp.estado)}`}>
                          {imp.estado}
                        </span>
                      </div>
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
