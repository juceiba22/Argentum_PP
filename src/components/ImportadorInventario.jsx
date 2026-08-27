import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { UploadCloud, AlertCircle, Loader2, ArrowRight, Table, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const CAMPOS_REQUERIDOS = [
  { key: 'nombre', label: 'Nombre del Insumo / Producto', type: 'text' },
  { key: 'cantidad', label: 'Cantidad (Stock Inicial)', type: 'number' },
  { key: 'precio_unitario', label: 'Costo / Precio Unitario', type: 'number' },
];

export default function ImportadorInventario({ tenantId, onImportSuccess, onClose }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({
    nombre: '',
    cantidad: '',
    precio_unitario: ''
  });
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Preview, 4: Uploading
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef(null);

  const processFile = (selectedFile) => {
    setErrorMsg('');
    if (!selectedFile) return;
    
    setFile(selectedFile);
    const extension = selectedFile.name.split('.').pop().toLowerCase();

    if (extension === 'csv') {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            setHeaders(Object.keys(results.data[0]));
            setParsedData(results.data);
            autoMapHeaders(Object.keys(results.data[0]));
            setStep(2);
          } else {
            setErrorMsg('El archivo CSV está vacío o no se pudo leer.');
          }
        },
        error: (err) => {
          setErrorMsg('Error al parsear CSV: ' + err.message);
        }
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          
          if (json.length > 0) {
            const cols = Object.keys(json[0]);
            setHeaders(cols);
            setParsedData(json);
            autoMapHeaders(cols);
            setStep(2);
          } else {
            setErrorMsg('El archivo Excel está vacío.');
          }
        } catch (err) {
          setErrorMsg('Error al leer Excel. Asegúrate de que el formato sea válido.');
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } else {
      setErrorMsg('Formato no soportado. Por favor sube un archivo .csv o .xlsx');
    }
  };

  const autoMapHeaders = (fileHeaders) => {
    const newMapping = { nombre: '', cantidad: '', precio_unitario: '' };
    fileHeaders.forEach(h => {
      const lower = h.toLowerCase();
      if (lower.includes('nombre') || lower.includes('descrip') || lower.includes('articulo') || lower.includes('producto')) {
        if (!newMapping.nombre) newMapping.nombre = h;
      }
      if (lower.includes('cant') || lower.includes('stock')) {
        if (!newMapping.cantidad) newMapping.cantidad = h;
      }
      if (lower.includes('precio') || lower.includes('costo') || lower.includes('p.vta') || lower.includes('importe')) {
        if (!newMapping.precio_unitario) newMapping.precio_unitario = h;
      }
    });
    setMapping(newMapping);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleMappingChange = (key, value) => {
    setMapping(prev => ({ ...prev, [key]: value }));
  };

  const goToPreview = () => {
    if (!mapping.nombre || !mapping.cantidad || !mapping.precio_unitario) {
      setErrorMsg('Debes mapear los tres campos obligatorios para continuar.');
      return;
    }
    setErrorMsg('');
    setStep(3);
  };

  const executeImport = async () => {
    if (!tenantId) {
      setErrorMsg('Error: No se identificó el comercio activo.');
      return;
    }

    setLoading(true);
    setStep(4);
    setProgress(0);
    setErrorMsg('');

    try {
      // Clean and format data based on mapping
      const itemsToInsert = parsedData.map(row => {
        let precio = String(row[mapping.precio_unitario]).replace(/[^0-9.,-]/g, '').replace(',', '.');
        let cantidad = String(row[mapping.cantidad]).replace(/[^0-9.,-]/g, '').replace(',', '.');
        
        return {
          tenant_id: tenantId,
          nombre: String(row[mapping.nombre] || 'Sin nombre').trim(),
          cantidad: parseFloat(cantidad) || 0,
          precio_unitario: parseFloat(precio) || 0,
          unidad_medida: 'unidades' // default
        };
      }).filter(item => item.nombre !== '' && item.nombre !== 'Sin nombre');

      // Batch insert logic
      const chunkSize = 500;
      let insertedCount = 0;

      for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
        const chunk = itemsToInsert.slice(i, i + chunkSize);
        const { error } = await supabase.from('inventario').insert(chunk);
        
        if (error) {
          throw new Error('Error en el lote ' + (i / chunkSize + 1) + ': ' + error.message);
        }

        insertedCount += chunk.length;
        setProgress(Math.round((insertedCount / itemsToInsert.length) * 100));
      }

      setTimeout(() => {
        if (onImportSuccess) onImportSuccess(insertedCount);
      }, 1000);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error desconocido al importar.');
      setStep(3); // Go back to preview
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // VISTAS SEGÚN EL PASO
  // ----------------------------------------------------

  const renderStep1 = () => (
    <div 
      onDragOver={handleDragOver} 
      onDrop={handleDrop}
      style={{
        border: '2px dashed var(--accent-primary)',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        backgroundColor: 'rgba(197, 160, 89, 0.03)',
        cursor: 'pointer'
      }}
      onClick={() => fileInputRef.current.click()}
    >
      <input 
        type="file" 
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
        ref={fileInputRef} 
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
          }
        }}
        style={{ display: 'none' }}
      />
      <UploadCloud size={48} color="var(--accent-primary)" style={{ margin: '0 auto 16px auto' }} />
      <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Subir archivo Excel o CSV</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Haz clic aquí o arrastra tu archivo sobre esta zona</p>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Mapeo de Columnas</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
        Encontramos {headers.length} columnas en tu archivo. Por favor, indícanos a qué corresponde cada una.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {CAMPOS_REQUERIDOS.map(campo => (
          <div key={campo.key} className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">{campo.label} *</label>
            <select 
              className="input-field" 
              value={mapping[campo.key]} 
              onChange={e => handleMappingChange(campo.key, e.target.value)}
              style={{ appearance: 'auto' }}
            >
              <option value="">-- Seleccionar columna del archivo --</option>
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
        <button className="btn btn-secondary" onClick={() => setStep(1)}>Atrás</button>
        <button className="btn btn-primary" onClick={goToPreview} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Continuar <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Vista Previa</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
        Revisa que los datos se vean correctos. Mostrando los primeros 5 productos de {parsedData.length} detectados.
      </p>

      <div className="table-responsive" style={{ marginBottom: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)' }}>
              <th>{CAMPOS_REQUERIDOS[0].label}</th>
              <th>{CAMPOS_REQUERIDOS[1].label}</th>
              <th>{CAMPOS_REQUERIDOS[2].label}</th>
            </tr>
          </thead>
          <tbody>
            {parsedData.slice(0, 5).map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td>{row[mapping.nombre]}</td>
                <td>{row[mapping.cantidad]}</td>
                <td>{row[mapping.precio_unitario]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(197, 160, 89, 0.1)', padding: '16px', borderRadius: '8px' }}>
        <div>
          <strong style={{ display: 'block', fontSize: '1.1rem' }}>Total a importar: {parsedData.length} productos</strong>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Los productos se agregarán a tu inventario actual.</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => setStep(2)}>Modificar columnas</button>
          <button className="btn btn-primary" onClick={executeImport} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Table size={18} /> Iniciar Importación
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <Loader2 size={48} color="var(--accent-primary)" className="animate-spin" style={{ margin: '0 auto 24px auto' }} />
      <h3 style={{ fontSize: '1.4rem', marginBottom: '12px' }}>Importando Productos...</h3>
      
      <div style={{ width: '100%', maxWidth: '400px', height: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', margin: '0 auto 16px auto', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent-primary)', transition: 'width 0.3s ease' }}></div>
      </div>
      
      <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{progress}% completado</p>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Por favor, no cierres esta ventana.</p>
    </div>
  );

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '24px', position: 'relative', marginBottom: '32px' }}>
      <button type="button" onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
        <X size={24} />
      </button>
      
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Table color="var(--accent-primary)" />
          Importación Masiva
        </h2>
      </div>

      {errorMsg && (
        <div style={{ marginBottom: '24px', padding: '12px 16px', background: 'rgba(183, 65, 52, 0.08)', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> <span>{errorMsg}</span>
        </div>
      )}

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </div>
  );
}
