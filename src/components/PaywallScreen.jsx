import { useNavigate } from 'react-router-dom';
import { MessageCircle, LogOut } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import LicenciaPanel from './LicenciaPanel';

// Se muestra en lugar de la app cuando terminó la prueba de 15 días y no hay
// licencia vigente. Desde acá mismo se paga o se activa un código.
export default function PaywallScreen() {
  const navigate = useNavigate();
  const { user, trialEndsAt } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleContactarSoporte = () => {
    const text = encodeURIComponent(`Hola, quiero activar la licencia anual de Argentum para la cuenta: ${user?.email || ''}`);
    window.open(`https://wa.me/5491166814208?text=${text}`, '_blank');
  };

  const vencio = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div style={{ minHeight: '100vh', padding: '48px 20px', display: 'flex', justifyContent: 'center' }}>
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '760px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 className="brand-title" style={{ fontSize: '2.4rem', marginBottom: '8px' }}>Argentum</h1>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Terminó tu período de prueba</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {vencio ? `La prueba gratuita de ${user?.email} venció el ${vencio}. ` : ''}
            Tus datos están guardados: activá la licencia anual y seguí exactamente donde estabas.
          </p>
        </div>

        <LicenciaPanel />

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '28px' }}>
          <button type="button" className="btn" onClick={handleContactarSoporte} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <MessageCircle size={18} /> Hablar con Argentum por WhatsApp
          </button>
          <button type="button" className="btn" onClick={handleSignOut} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
