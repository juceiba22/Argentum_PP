import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, FileText, CheckCircle, AlertCircle, Clock, Loader2, Download, Trash2, Eye, 
  Sparkles, X, TrendingUp, TrendingDown, AlertTriangle, RefreshCw 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ImportService } from '../services/ImportService';

export default function Importaciones() {
  const { user } = useAuth();
  const [importaciones, setImportaciones] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Estados de subida
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [origen, setOrigen] = useState('BANCO');
  
  // IDs de archivos actualmente en procesamiento IA local
  const [processingIds, setProcessingIds] = useState(new Set());

  // Mensajes (Toasts simulados en la UI)
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  // Estado del Modal de Reporte IA
  const [selectedReportImportacion, setSelectedReportImportacion] = useState(null);

  const fetchImportaciones = async () => {
    if (!user) return;
    try {
      const data = await ImportService.getImportaciones(user.id);
      setImportaciones(data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el historial de importaciones.');
    }
  };

  useEffect(() => {
    fetchImportaciones();
  }, [user]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setError('');
    setTimeout(() => setSuccess(''), 5000);
  };

  const showError = (msg) => {
    setError(msg);
    setSuccess('');
  };

  const handleGenerarReporte = async (importacion) => {
    setError('');
    setProcessingIds(prev => new Set(prev).add(importacion.id));

    try {
      showSuccess(`Generando Reporte IA para ${importacion.nombre_archivo}...`);
      const updatedRecord = await ImportService.triggerProcessImportacion(importacion.id);
      await fetchImportaciones();
      showSuccess(`Reporte IA generado exitosamente para ${importacion.nombre_archivo}.`);
      setSelectedReportImportacion(updatedRecord);
    } catch (err) {
      console.error(err);
      showError(err.message || 'Error al generar el reporte IA.');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(importacion.id);
        return next;
      });
    }
  };

  const validateAndProcessFile = async (file) => {
    setError('');
    setSuccess('');
    
    if (!file) return;

    setUploading(true);
    setProgress(0);
    
    // Simulación de progreso
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    try {
      const result = await ImportService.uploadFile(
        { file, origen },
        user.id,
        (p) => setProgress(p > 90 ? p : progress)
      );

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success && result.data) {
        showSuccess('Archivo subido correctamente. Generando reporte IA...');
        fetchImportaciones(); // Actualizar historial automáticamente
        
        // Disparar procesamiento de reporte inmediatamente
        try {
          const updated = await ImportService.triggerProcessImportacion(result.data.id);
          fetchImportaciones();
          setSelectedReportImportacion(updated);
        } catch (procErr) {
          console.error(procErr);
          fetchImportaciones();
        }
      } else {
        showError(result.error || 'No fue posible subir el archivo');
      }
    } catch (err) {
      clearInterval(progressInterval);
      showError('No fue posible subir el archivo');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!uploading) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploading) return;
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
    if (!uploading) fileInputRef.current?.click();
  };

  const handleDelete = async (importacion) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este archivo? Esta acción no se puede deshacer.')) return;
    try {
      await ImportService.deleteImportacion(importacion);
      showSuccess('Importación eliminada correctamente.');
      if (selectedReportImportacion?.id === importacion.id) {
        setSelectedReportImportacion(null);
      }
      fetchImportaciones();
    } catch (err) {
      showError(err.message || 'Error al eliminar importación');
    }
  };

  const handleDownload = async (importacion) => {
    try {
      const url = await ImportService.getSignedUrl(importacion.ruta_storage);
      window.open(url, '_blank');
    } catch (err) {
      showError(err.message || 'Error al descargar archivo');
    }
  };

  const getStatusIcon = (estado, isProcessing) => {
    if (isProcessing) return <Loader2 size={20} className="animate-spin" style={{ color: '#3b82f6' }} />;
    switch(estado) {
      case 'Pendiente': return <Clock size={20} style={{ color: 'var(--warning)' }} />;
      case 'Procesando': return <Loader2 size={20} className="animate-spin" style={{ color: '#3b82f6' }} />;
      case 'Procesado': return <CheckCircle size={20} style={{ color: 'var(--success)' }} />;
      case 'Error': return <AlertCircle size={20} style={{ color: 'var(--danger)' }} />;
      default: return <Clock size={20} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  const getBadgeClass = (estado, isProcessing) => {
    if (isProcessing) return 'badge-enviado';
    switch(estado) {
      case 'Pendiente': return 'badge-pendiente';
      case 'Procesando': return 'badge-enviado';
      case 'Procesado': return 'badge-pagado';
      case 'Error': return 'badge-cancelado';
      default: return 'badge-pendiente';
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const parseReporte = (resultado) => {
    if (!resultado) return null;
    if (typeof resultado === 'string') {
      try {
        return JSON.parse(resultado);
      } catch (e) {
        return null;
      }
    }
    return resultado;
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return null;
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(val);
  };

  const reporteData = selectedReportImportacion ? parseReporte(selectedReportImportacion.resultado_procesamiento) : null;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px', maxWidth: '950px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Importaciones Bancarias</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
          Suba extractos y comprobantes para su posterior procesamiento y análisis inteligente.
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

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '48px' }}>
        
        <div className="input-group" style={{ maxWidth: '300px', marginBottom: '24px' }}>
          <label className="input-label">Origen de Datos</label>
          <select 
            className="input-field" 
            value={origen}
            onChange={(e) => setOrigen(e.target.value)}
            disabled={uploading}
          >
            <option value="BANCO">Extracto Bancario</option>
            <option value="ARCA">Comprobantes ARCA</option>
            <option value="PAYWAY">Liquidación PayWay</option>
            <option value="MERCADOPAGO">Movimientos Mercado Pago</option>
            <option value="OTRO">Otro Origen</option>
          </select>
        </div>

        <div 
          style={{
            padding: '48px 32px', 
            textAlign: 'center', 
            transition: 'all 0.3s ease',
            border: isDragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--glass-border)',
            backgroundColor: isDragging ? 'rgba(197, 160, 89, 0.03)' : 'var(--bg-color)',
            cursor: uploading ? 'default' : 'pointer',
            borderRadius: '8px'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerSelect}
        >
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={48} className="animate-spin" style={{ color: 'var(--accent-primary)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--text-primary)' }}>
                Subiendo archivo...
              </h3>
              <div style={{ width: '100%', maxWidth: '300px', backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
                <div style={{ height: '100%', backgroundColor: 'var(--accent-primary)', width: `${progress}%`, transition: 'width 0.2s ease' }}></div>
              </div>
              <p style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{Math.round(progress)}%</p>
            </div>
          ) : (
            <>
              <UploadCloud size={64} style={{ color: isDragging ? 'var(--accent-primary)' : 'var(--text-secondary)', margin: '0 auto 16px auto', transition: 'color 0.3s' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Arrastre y suelte su archivo aquí</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>o haga clic para seleccionarlo desde su computadora</p>
              
              <button 
                onClick={(e) => { e.stopPropagation(); triggerSelect(); }}
                disabled={uploading}
                className="btn btn-primary"
              >
                Seleccionar Archivo
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
                accept=".csv,.xlsx,.xls,.pdf"
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '20px', letterSpacing: '0.5px' }}>
                TIPOS PERMITIDOS: CSV, XLSX, XLS, PDF (MÁX. 20MB)
              </p>
            </>
          )}
        </div>
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
                  <th style={{ textAlign: 'center' }}>Origen</th>
                  <th style={{ textAlign: 'center' }}>Tamaño</th>
                  <th style={{ textAlign: 'center' }}>Fecha</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {importaciones.map((imp) => {
                  const isProcessing = imp.estado === 'Procesando' || processingIds.has(imp.id);
                  const tieneReporte = !!imp.resultado_procesamiento;

                  return (
                    <tr key={imp.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <FileText size={20} style={{ color: 'var(--text-secondary)' }} />
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }} title={imp.nombre_archivo}>
                              {imp.nombre_archivo.length > 30 ? imp.nombre_archivo.substring(0, 30) + '...' : imp.nombre_archivo}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>
                              {imp.tipo_archivo}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                        {imp.origen}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {formatBytes(imp.tamano)}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {new Date(imp.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          {getStatusIcon(imp.estado, isProcessing)}
                          <span className={`badge ${getBadgeClass(imp.estado, isProcessing)}`}>
                            {isProcessing ? 'Procesando' : imp.estado}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {isProcessing ? (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '0.8rem', opacity: 0.8 }}
                              disabled
                            >
                              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                              <span>Procesando...</span>
                            </button>
                          ) : tieneReporte ? (
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                              title="Ver Reporte IA"
                              onClick={() => setSelectedReportImportacion(imp)}
                            >
                              <Sparkles size={16} />
                              <span>Reporte IA</span>
                            </button>
                          ) : (
                            <button 
                              className="btn btn-primary" 
                              style={{ 
                                padding: '6px 12px', 
                                fontSize: '0.8rem', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px'
                              }}
                              title="Generar Reporte IA"
                              onClick={() => handleGenerarReporte(imp)}
                            >
                              <Sparkles size={16} />
                              <span>Generar Reporte IA</span>
                            </button>
                          )}

                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px', fontSize: '0.8rem' }}
                            title="Descargar"
                            onClick={() => handleDownload(imp)}
                          >
                            <Download size={16} />
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'rgba(183,65,52,0.3)' }}
                            title="Eliminar"
                            onClick={() => handleDelete(imp)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE REPORTE ANALÍTICO GEMINI IA */}
      {selectedReportImportacion && reporteData && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedReportImportacion(null)}
        >
          <div 
            style={{
              backgroundColor: 'var(--panel-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              padding: '28px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* BOTÓN CERRAR */}
            <button
              onClick={() => setSelectedReportImportacion(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <X size={24} />
            </button>

            {/* ENCABEZADO MODAL */}
            <div style={{ marginBottom: '24px', paddingRight: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <Sparkles size={24} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-primary)' }}>
                  Reporte de Análisis IA
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                <span><strong>Archivo:</strong> {selectedReportImportacion.nombre_archivo}</span>
                <span>•</span>
                <span><strong>Origen:</strong> {selectedReportImportacion.origen}</span>
                <span>•</span>
                <span><strong>Fecha:</strong> {new Date(selectedReportImportacion.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* TARJETAS DE KPIS */}
            {(reporteData.monto_total_ingresos !== undefined || reporteData.monto_total_egresos !== undefined || reporteData.total_operaciones !== undefined) && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px', 
                marginBottom: '24px' 
              }}>
                {reporteData.monto_total_ingresos !== undefined && (
                  <div style={{ 
                    padding: '16px', 
                    borderRadius: '10px', 
                    backgroundColor: 'rgba(74, 124, 89, 0.08)', 
                    border: '1px solid rgba(74, 124, 89, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Ingresos Totales</span>
                      <TrendingUp size={20} style={{ color: 'var(--success)' }} />
                    </div>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>
                      {formatCurrency(reporteData.monto_total_ingresos)}
                    </span>
                  </div>
                )}

                {reporteData.monto_total_egresos !== undefined && (
                  <div style={{ 
                    padding: '16px', 
                    borderRadius: '10px', 
                    backgroundColor: 'rgba(183, 65, 52, 0.08)', 
                    border: '1px solid rgba(183, 65, 52, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Egresos Totales</span>
                      <TrendingDown size={20} style={{ color: 'var(--danger)' }} />
                    </div>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger)' }}>
                      {formatCurrency(reporteData.monto_total_egresos)}
                    </span>
                  </div>
                )}

                {reporteData.total_operaciones !== undefined && (
                  <div style={{ 
                    padding: '16px', 
                    borderRadius: '10px', 
                    backgroundColor: 'rgba(197, 160, 89, 0.08)', 
                    border: '1px solid rgba(197, 160, 89, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Operaciones</span>
                      <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                      {reporteData.total_operaciones}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN RESUMEN EJECUTIVO */}
            {reporteData.resumen && (
              <div style={{ 
                marginBottom: '24px',
                padding: '18px',
                borderRadius: '10px',
                backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--glass-border)'
              }}>
                <h4 style={{ fontSize: '1rem', marginTop: 0, marginBottom: '10px', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Resumen Ejecutivo
                </h4>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                  {reporteData.resumen}
                </p>
              </div>
            )}

            {/* SECCIÓN HALLAZGOS CLAVE */}
            {reporteData.hallazgos_clave && reporteData.hallazgos_clave.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '1rem', marginTop: 0, marginBottom: '12px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Hallazgos Clave
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reporteData.hallazgos_clave.map((hallazgo, idx) => (
                    <li key={idx} style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                      {hallazgo}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SECCIÓN ALERTAS Y ANOMALÍAS */}
            {((reporteData.alertas && reporteData.alertas.length > 0) || (reporteData.anomalias && reporteData.anomalias.length > 0)) && (
              <div style={{ 
                marginBottom: '24px',
                padding: '18px',
                borderRadius: '10px',
                backgroundColor: 'rgba(210, 142, 61, 0.08)',
                border: '1px solid rgba(210, 142, 61, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <AlertTriangle size={20} style={{ color: 'var(--warning, #f59e0b)' }} />
                  <h4 style={{ fontSize: '1rem', margin: 0, color: 'var(--warning, #f59e0b)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Alertas y Observaciones
                  </h4>
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reporteData.alertas && reporteData.alertas.map((alerta, idx) => (
                    <li key={`alerta-${idx}`} style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                      {alerta}
                    </li>
                  ))}
                  {reporteData.anomalias && reporteData.anomalias.map((anomalia, idx) => (
                    <li key={`anomalia-${idx}`} style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                      <strong>Anomalía:</strong> {anomalia}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* BOTÓN INFERIOR CERRAR / RE-PROCESAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
                onClick={() => handleGenerarReporte(selectedReportImportacion)}
              >
                <RefreshCw size={14} style={{ marginRight: '6px' }} />
                <span>Re-generar Reporte</span>
              </button>

              <button
                className="btn btn-primary"
                onClick={() => setSelectedReportImportacion(null)}
              >
                Cerrar Reporte
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
