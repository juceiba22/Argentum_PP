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
    const file = e.dataTransfer.files[0];
    validateAndProcessFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    validateAndProcessFile(file);
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  const getStatusIcon = (estado) => {
    switch(estado) {
      case 'Pendiente': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'Procesando': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'Procesado': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
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
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Importaciones Bancarias</h1>
      <p className="text-gray-600 mb-8">Suba extractos bancarios para ser procesados posteriormente.</p>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      <div 
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadCloud className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Arrastre y suelte su archivo aquí</h3>
        <p className="text-gray-500 mb-6">o si lo prefiere...</p>
        <button 
          onClick={triggerSelect}
          disabled={uploading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {uploading ? 'Subiendo...' : 'Seleccionar Archivo'}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept=".csv,.xlsx,.xls,.pdf"
        />
        <p className="text-sm text-gray-400 mt-4">Tipos permitidos: CSV, XLSX, XLS, PDF</p>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Historial de Importaciones</h2>
        
        {importaciones.length === 0 ? (
          <p className="text-gray-500 italic">No hay importaciones registradas.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {importaciones.map((imp) => (
              <div key={imp.id} className="bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
                    <div className="truncate">
                      <h4 className="font-medium text-gray-900 truncate" title={imp.nombre_archivo}>
                        {imp.nombre_archivo}
                      </h4>
                      <p className="text-xs text-gray-500 uppercase">{imp.tipo_archivo} • {formatBytes(imp.tamano)}</p>
                    </div>
                  </div>
                  {getStatusIcon(imp.estado)}
                </div>
                
                <div className="pt-3 border-t flex justify-between items-center mt-2">
                  <div className="text-xs text-gray-500">
                    {new Date(imp.created_at).toLocaleDateString()} {new Date(imp.created_at).toLocaleTimeString()}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full 
                    ${imp.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' : 
                      imp.estado === 'Procesando' ? 'bg-blue-100 text-blue-800' : 
                      imp.estado === 'Procesado' ? 'bg-green-100 text-green-800' : 
                      'bg-red-100 text-red-800'}`}>
                    {imp.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
