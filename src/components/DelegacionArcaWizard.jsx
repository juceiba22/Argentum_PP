import React, { useState } from 'react';
import { 
  CheckCircle2, ExternalLink, Copy, Check, ShieldCheck, 
  Sparkles, Lock, X
} from 'lucide-react';

/**
 * CUIT de la Plataforma Administradora (Fácilmente editable)
 */
export const PLATFORM_CUIT = '20-00000000-0';
export const PLATFORM_NOMBRE = 'Empresa Plataforma S.A.';

export default function DelegacionArcaWizard({ onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCuit = () => {
    navigator.clipboard.writeText(PLATFORM_CUIT.replace(/\D/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pasos = [
    {
      numero: 1,
      titulo: 'Acceder a ARCA / AFIP',
      descripcion: 'Entrá al portal oficial de ARCA con tu CUIT y Clave Fiscal (auth.afip.gob.ar).',
      link: 'https://auth.afip.gob.ar/'
    },
    {
      numero: 2,
      titulo: 'Buscar Administrador de Relaciones',
      descripcion: 'Dentro de tus servicios en pantalla, buscá y seleccioná "Administrador de Relaciones de Clave Fiscal".'
    },
    {
      numero: 3,
      titulo: 'Nueva Relación de Servicio',
      descripcion: 'Hacé clic en el botón "Nueva Relación" y luego seleccioná ARCA → WebServices.'
    },
    {
      numero: 4,
      titulo: 'Seleccionar Servicio',
      descripcion: 'Buscá y elegí el servicio denominado "Facturación Electrónica".'
    },
    {
      numero: 5,
      titulo: 'Ingresar CUIT Representante de la Plataforma',
      descripcion: `En el campo "Representante", ingresá nuestro CUIT: ${PLATFORM_CUIT} y confirmá que el nombre del representante coincida.`,
      hasCopy: true
    },
    {
      numero: 6,
      titulo: 'Confirmar la Delegación',
      descripcion: 'Confirmá la relación (el sistema te pedirá confirmación dos veces para finalizar).'
    },
    {
      numero: 7,
      titulo: 'Crear Punto de Venta',
      descripcion: 'Creá un punto de venta nuevo específico para Facturación Electrónica (Web Services) en "Administración de puntos de venta y domicilios".'
    }
  ];

  return (
    <div className="glass-panel" style={{ padding: '32px', maxWidth: '680px', width: '100%', position: 'relative' }}>
      
      {/* Botón Cerrar (si está en modal) */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            padding: '4px'
          }}
          title="Cerrar"
        >
          <X size={22} />
        </button>
      )}

      {/* Encabezado con Avatar Asistente */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '16px' }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: 'rgba(197, 160, 89, 0.15)',
          border: '2px solid var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-primary)',
          flexShrink: 0
        }}>
          <Sparkles size={28} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Asistente de Delegación en ARCA
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Te guiamos paso a paso para autorizar la Facturación Electrónica sin compartir tu Clave Fiscal.
          </p>
        </div>
      </div>

      {/* Caja Destacada con el CUIT de la Plataforma */}
      <div style={{
        backgroundColor: 'rgba(197, 160, 89, 0.08)',
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        padding: '16px 20px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            CUIT de nuestra plataforma a ingresar:
          </span>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {PLATFORM_CUIT}
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopyCuit}
          className="btn btn-secondary"
          style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
          {copied ? '¡Copiado!' : 'Copiar CUIT'}
        </button>
      </div>

      {/* Lista Numerada de Pasos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {pasos.map((paso) => (
          <div 
            key={paso.numero} 
            style={{ 
              display: 'flex', 
              gap: '16px', 
              alignItems: 'flex-start',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid rgba(0, 0, 0, 0.04)'
            }}
          >
            {/* Ícono Numerado / Check */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              flexShrink: 0,
              marginTop: '2px'
            }}>
              {paso.numero}
            </div>

            {/* Contenido del Paso */}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{paso.titulo}</span>
                <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {paso.descripcion}
              </p>

              {paso.link && (
                <a 
                  href={paso.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.82rem', color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}
                >
                  Abrir portal oficial AFIP <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Aclaración de Seguridad */}
      <div style={{
        padding: '16px 20px',
        borderRadius: '8px',
        backgroundColor: 'rgba(74, 124, 89, 0.08)',
        border: '1px solid var(--success)',
        color: 'var(--text-primary)',
        fontSize: '0.85rem',
        lineHeight: 1.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <Lock size={20} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Garantía de Seguridad y Privacidad:</strong> Este proceso ocurre enteramente dentro del portal oficial de ARCA / AFIP. Nuestra plataforma <strong>NUNCA recibe ni solicita tu Clave Fiscal</strong> ni contraseñas personales. La delegación solo autoriza la emisión de facturas electrónicas a través de los servidores oficiales de AFIP.
        </div>
      </div>

    </div>
  );
}
