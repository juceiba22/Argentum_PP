import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Scale, Receipt, CreditCard, Beef, Truck, Calculator, Wallet, Megaphone,
  Users, ShieldCheck, ArrowRight, Check, ChevronDown, Menu, X
} from 'lucide-react';
import { STARTER_PRODUCTS_CARNICERIA } from '../utils/starterProducts';
import './Landing.css';

const CORTES_INICIALES = STARTER_PRODUCTS_CARNICERIA.length;

const FUNCIONES = [
  {
    icon: Scale,
    titulo: 'Mostrador que vende por kilo',
    texto: 'Cargás el peso de la balanza y el sistema calcula el importe al instante. Kilos, gramos o unidades, cada corte con su precio.'
  },
  {
    icon: Receipt,
    titulo: 'Factura electrónica ARCA',
    texto: 'Emití Facturas A y B con CAE desde la misma venta, con PDF listo para imprimir o mandar. Sin certificados: delegás el servicio en 5 minutos.'
  },
  {
    icon: CreditCard,
    titulo: 'Todos los medios de cobro',
    texto: 'Efectivo, Mercado Pago Point integrado, Cuenta DNI, tarjetas y transferencia. El cobro con Point se envía directo a la terminal.'
  },
  {
    icon: Beef,
    titulo: 'Desposte de media res',
    texto: 'Cargás los kilos de la media res y el sistema calcula cuánto sale de cada corte (vacío, asado, nalga, bife) y lo suma al stock.'
  },
  {
    icon: Truck,
    titulo: 'Compras a frigoríficos',
    texto: 'Registrá cada compra a tu frigorífico o proveedor: repone el stock y guarda el historial de precios por corte.'
  },
  {
    icon: Calculator,
    titulo: 'Costo real por kilo',
    texto: 'Prorratea alquiler, luz, sueldos y la amortización de la cámara y la sierra sobre los kilos que vendés. Ves tu precio mínimo para no perder.'
  },
  {
    icon: Wallet,
    titulo: 'Caja y liquidez',
    texto: 'Apertura y cierre de caja por turno, gastos e ingresos en un solo lugar. Al final del día sabés exactamente qué entró y qué salió.'
  },
  {
    icon: Megaphone,
    titulo: 'Ofertas y pedidos por WhatsApp',
    texto: 'Publicá tus promos en un catálogo online. Tus clientes arman el pedido y te llega armado por WhatsApp, con retiro o envío.'
  },
  {
    icon: Users,
    titulo: 'Clientes y vendedores',
    texto: 'Historial de compras de cada cliente y un perfil de vendedor de mostrador que solo ve la caja y las ventas.'
  }
];

const PASOS = [
  {
    titulo: 'Creá tu cuenta',
    texto: 'Datos de tu carnicería, CUIT y condición fiscal. Son 4 pasos y menos de 5 minutos.'
  },
  {
    titulo: 'Arrancá con tus cortes',
    texto: `Te cargamos ${CORTES_INICIALES} cortes de ejemplo (vacuno, cerdo, pollo, embutidos y achuras). Ajustás precios y listo.`
  },
  {
    titulo: 'Conectá ARCA y Mercado Pago',
    texto: 'Delegás la facturación electrónica y vinculás tu Point. Desde ahí, cada venta sale facturada y cobrada.'
  }
];

const PREGUNTAS = [
  {
    q: '¿Necesito comprar un certificado digital para facturar?',
    a: 'No. Desde ARCA delegás el servicio de factura electrónica a Argentum con tu Clave Fiscal y el sistema emite los comprobantes por vos. Te guiamos paso a paso dentro de la app.'
  },
  {
    q: '¿Cómo funciona la venta por peso?',
    a: 'En el mostrador elegís el corte, ingresás el peso que marca tu balanza y el sistema calcula el importe con el precio por kilo vigente. También podés vender por gramos o por unidad.'
  },
  {
    q: '¿Qué pasa cuando terminan los 15 días de prueba?',
    a: 'Tus datos quedan guardados. Para seguir operando activás la Licencia Pro y continuás exactamente donde estabas.'
  },
  {
    q: '¿Puedo usarlo desde el celular o la tablet?',
    a: 'Sí. Argentum funciona en el navegador, así que lo usás desde la PC del mostrador, una tablet o tu celular, sin instalar nada.'
  },
  {
    q: '¿Puedo tener empleados usando el sistema?',
    a: 'Sí. Además del perfil de dueño, hay un perfil de vendedor que solo accede a la caja, las ventas y las promociones, sin ver tus números.'
  }
];

function TicketDemo() {
  const items = [
    { corte: 'Vacío', kg: '1,250', precio: '11.125' },
    { corte: 'Chorizo parrillero', kg: '0,800', precio: '4.640' },
    { corte: 'Bondiola de cerdo', kg: '1,100', precio: '8.690' },
    { corte: 'Carne picada especial', kg: '0,500', precio: '3.100' }
  ];

  return (
    <div className="lp-ticket" aria-label="Ejemplo de una venta en Argentum">
      <div className="lp-ticket-head">
        <span className="lp-ticket-title">Venta #0148</span>
        <span className="lp-pill">Mostrador</span>
      </div>
      <ul className="lp-ticket-items">
        {items.map(i => (
          <li key={i.corte}>
            <div>
              <div className="lp-ticket-corte">{i.corte}</div>
              <div className="lp-ticket-kg">{i.kg} kg</div>
            </div>
            <span className="lp-ticket-precio">${i.precio}</span>
          </li>
        ))}
      </ul>
      <div className="lp-ticket-total">
        <span>Total</span>
        <span>$27.555</span>
      </div>
      <div className="lp-ticket-foot">
        <span className="lp-ok"><Check size={14} /> Cobrado con Mercado Pago Point</span>
        <span className="lp-ok"><Check size={14} /> Factura B emitida · CAE</span>
      </div>
    </div>
  );
}

function Pregunta({ q, a }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div className={`lp-faq-item ${abierta ? 'open' : ''}`}>
      <button type="button" className="lp-faq-q" onClick={() => setAbierta(!abierta)} aria-expanded={abierta}>
        <span>{q}</span>
        <ChevronDown size={18} />
      </button>
      {abierta && <p className="lp-faq-a">{a}</p>}
    </div>
  );
}

export default function Landing() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <Link to="/" className="lp-logo">Argentum<span>.</span></Link>
          <nav className={`lp-nav-links ${menuAbierto ? 'open' : ''}`} onClick={() => setMenuAbierto(false)}>
            <a href="#funciones">Funciones</a>
            <a href="#costos">Costo por kilo</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#preguntas">Preguntas</a>
            <Link to="/login" className="lp-nav-login">Ingresar</Link>
            <Link to="/login?registro=1" className="lp-btn lp-btn-primary lp-btn-sm">Probar gratis</Link>
          </nav>
          <button type="button" className="lp-nav-toggle" onClick={() => setMenuAbierto(!menuAbierto)} aria-label="Abrir menú">
            {menuAbierto ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-container lp-hero-content">
            <p className="lp-eyebrow lp-eyebrow-light">Software de gestión para carnicerías</p>
            <h1 className="lp-h1">
              Tu carnicería, <em>al kilo</em> y en orden.
            </h1>
            <p className="lp-lead">
              Vendé por peso, despostá la media res, facturá con ARCA, cobrá con Mercado Pago Point
              y sabé cuánto te cuesta de verdad cada kilo que sale del mostrador.
            </p>
            <div className="lp-cta-row">
              <Link to="/login?registro=1" className="lp-btn lp-btn-primary">
                Probar 15 días gratis <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="lp-btn lp-btn-glass">Ya tengo cuenta</Link>
            </div>
            <ul className="lp-checks">
              <li><Check size={16} /> Sin tarjeta de crédito</li>
              <li><Check size={16} /> {CORTES_INICIALES} cortes precargados</li>
              <li><Check size={16} /> Listo en 5 minutos</li>
            </ul>
          </div>
        </section>

        <section className="lp-section lp-section-demo">
          <div className="lp-container lp-split">
            <div>
              <p className="lp-eyebrow">Así se ve una venta</p>
              <h2 className="lp-h2">Del mostrador a la factura en segundos.</h2>
              <p className="lp-sub">
                Elegís el corte, cargás el peso de la balanza y cobrás: el ticket, el cobro con Point y la
                factura electrónica salen de la misma pantalla, y el stock se descuenta solo.
              </p>
            </div>
            <TicketDemo />
          </div>
        </section>

        <section id="funciones" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <p className="lp-eyebrow">Todo lo que pasa en el mostrador</p>
              <h2 className="lp-h2">Pensado para la carnicería, no adaptado a ella.</h2>
              <p className="lp-sub">
                Nada de sistemas genéricos con códigos de barra y talles. Argentum habla tu idioma:
                kilos, cortes, frigoríficos y cámara.
              </p>
            </div>
            <div className="lp-grid">
              {FUNCIONES.map(({ icon: Icon, titulo, texto }) => (
                <article key={titulo} className="lp-card">
                  <div className="lp-card-icon"><Icon size={22} /></div>
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="costos" className="lp-section lp-section-dark">
          <div className="lp-container lp-split">
            <div>
              <p className="lp-eyebrow lp-eyebrow-light">Desposte y costo real por kilo</p>
              <h2 className="lp-h2">¿Ganás plata con el vacío, o solo lo vendés?</h2>
              <p className="lp-sub lp-sub-light">
                Cargás la media res que te mandó el frigorífico y Argentum calcula cuántos kilos vas a
                sacar de cada corte, con su desperdicio, y los suma al stock.
              </p>
              <p className="lp-sub lp-sub-light">
                El precio del frigorífico es solo una parte. Argentum suma lo que te cuesta tener
                la persiana levantada (alquiler, luz, sueldos, la cámara que se amortiza) y lo reparte
                sobre los kilos que vendés en el mes.
              </p>
              <p className="lp-sub lp-sub-light">
                Así ves el precio mínimo de cada corte antes de poner la pizarra.
              </p>
            </div>
            <div className="lp-cost">
              <div className="lp-cost-title">Vacío · costo por kg</div>
              <div className="lp-cost-row"><span>Última compra al frigorífico</span><span>$7.400</span></div>
              <div className="lp-cost-row"><span>Gastos fijos prorrateados</span><span>+ $640</span></div>
              <div className="lp-cost-row"><span>Sueldos prorrateados</span><span>+ $520</span></div>
              <div className="lp-cost-row"><span>Amortización de equipos</span><span>+ $90</span></div>
              <div className="lp-cost-row lp-cost-total"><span>Costo real</span><span>$8.650</span></div>
              <div className="lp-cost-note">Valores de ejemplo. Argentum los calcula con tus compras y gastos reales.</div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <p className="lp-eyebrow">Cómo funciona</p>
              <h2 className="lp-h2">Hoy te registrás, mañana ya facturás.</h2>
            </div>
            <ol className="lp-steps">
              {PASOS.map((p, idx) => (
                <li key={p.titulo} className="lp-step">
                  <span className="lp-step-num">{idx + 1}</span>
                  <h3>{p.titulo}</h3>
                  <p>{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="lp-section lp-section-soft">
          <div className="lp-container lp-trust">
            <div className="lp-trust-item">
              <ShieldCheck size={22} />
              <div>
                <strong>Tus datos, solo tuyos</strong>
                <p>Cada carnicería opera en un espacio aislado. Nadie más ve tus ventas ni tus precios.</p>
              </div>
            </div>
            <div className="lp-trust-item">
              <Receipt size={22} />
              <div>
                <strong>Al día con ARCA</strong>
                <p>Comprobantes electrónicos con CAE para monotributistas y responsables inscriptos.</p>
              </div>
            </div>
            <div className="lp-trust-item">
              <CreditCard size={22} />
              <div>
                <strong>Mercado Pago Point</strong>
                <p>El monto viaja solo a la terminal: sin tipear importes ni cobrar de menos.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="preguntas" className="lp-section">
          <div className="lp-container lp-faq">
            <div className="lp-section-head">
              <p className="lp-eyebrow">Preguntas frecuentes</p>
              <h2 className="lp-h2">Lo que nos preguntan los carniceros.</h2>
            </div>
            {PREGUNTAS.map(p => <Pregunta key={p.q} {...p} />)}
          </div>
        </section>

        <section className="lp-final">
          <div className="lp-container lp-final-inner">
            <h2 className="lp-h2">Probalo 15 días en tu mostrador.</h2>
            <p className="lp-sub lp-sub-light">Sin tarjeta, sin instalación y con tus cortes ya cargados.</p>
            <Link to="/login?registro=1" className="lp-btn lp-btn-light">
              Crear mi cuenta gratis <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <a
        className="lp-whatsapp"
        href="https://wa.me/5491178270751?text=Hola%2C%20quiero%20saber%20m%C3%A1s%20sobre%20Argentum%20para%20mi%20carnicer%C3%ADa"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribinos por WhatsApp"
      >
        <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
          <path fill="currentColor" d="M16.04 3C9.4 3 4 8.38 4 15c0 2.12.56 4.19 1.62 6.02L4 29l8.2-1.58A12.1 12.1 0 0 0 16.04 27C22.66 27 28 21.62 28 15S22.66 3 16.04 3Zm0 21.8c-1.8 0-3.56-.48-5.1-1.4l-.37-.22-4.87.94.97-4.73-.24-.38A9.7 9.7 0 0 1 6.3 15c0-5.38 4.37-9.76 9.74-9.76 5.37 0 9.74 4.38 9.74 9.76s-4.37 9.8-9.74 9.8Zm5.35-7.3c-.29-.15-1.73-.85-2-.95-.27-.1-.46-.15-.66.15-.19.29-.76.95-.93 1.14-.17.2-.34.22-.63.08-.29-.15-1.23-.45-2.35-1.45-.87-.77-1.45-1.73-1.62-2.02-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.08-.15-.66-1.58-.9-2.17-.24-.57-.48-.49-.66-.5h-.56c-.2 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.43 0 1.43 1.05 2.82 1.2 3.01.14.2 2.06 3.14 4.98 4.4.7.3 1.24.48 1.67.61.7.22 1.33.19 1.83.12.56-.08 1.73-.7 1.97-1.39.24-.68.24-1.27.17-1.39-.07-.12-.27-.2-.56-.34Z"/>
        </svg>
      </a>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <span className="lp-logo lp-logo-sm">Argentum<span>.</span></span>
          <span>Software de gestión para carnicerías · Hecho en Argentina</span>
          <a className="lp-credito" href="https://unsplash.com/photos/qgfjZUXup1M" target="_blank" rel="noopener noreferrer">Foto: Kyle Mackie / Unsplash (editada)</a>
          <Link to="/login">Ingresar</Link>
        </div>
      </footer>
    </div>
  );
}
