const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Inicialización de Express
const app = express();

// Habilitar CORS para peticiones desde el frontend (ej. localhost:5173 o vercel)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '25mb' }));

const PORT = process.env.PORT || 3001;

// Inicialización del cliente de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR CRÍTICO: Faltan las variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el archivo .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Variables globales de estado del cliente WhatsApp
let whatsappStatus = 'DISCONNECTED'; // 'DISCONNECTED' | 'QR_READY' | 'CONNECTED'
let currentQrCodeDataUrl = null;
let client = null;

function createWhatsAppClient() {
  whatsappStatus = 'DISCONNECTED';
  currentQrCodeDataUrl = null;

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  client.on('qr', async (qr) => {
    whatsappStatus = 'QR_READY';
    console.log('\n===============================================================');
    console.log('⚡ NUEVO CÓDIGO QR GENERADO. ESCANEAR CON WHATSAPP:');
    console.log('===============================================================\n');
    qrcodeTerminal.generate(qr, { small: true });

    try {
      // Convertir el string QR a DataURL (base64) para renderizar en el navegador
      currentQrCodeDataUrl = await QRCode.toDataURL(qr);
    } catch (err) {
      console.error('Error convirtiendo QR a DataURL:', err);
    }
  });

  client.on('ready', () => {
    whatsappStatus = 'CONNECTED';
    currentQrCodeDataUrl = null;
    console.log('\n===============================================================');
    console.log('✅ CLIENTE DE WHATSAPP WEB CONECTADO Y LISTO');
    console.log('===============================================================\n');
  });

  client.on('authenticated', () => {
    console.log('🔐 Sesión de WhatsApp autenticada correctamente.');
  });

  client.on('auth_failure', (msg) => {
    whatsappStatus = 'DISCONNECTED';
    currentQrCodeDataUrl = null;
    console.error('❌ Error de autenticación en WhatsApp:', msg);
  });

  client.on('disconnected', (reason) => {
    whatsappStatus = 'DISCONNECTED';
    currentQrCodeDataUrl = null;
    console.warn('⚠️ Cliente de WhatsApp desconectado:', reason);
  });

  client.initialize().catch(err => {
    console.error('Error inicializando cliente de WhatsApp:', err);
  });
}

// Inicializar cliente por primera vez
createWhatsAppClient();

/**
 * Normaliza y limpia un número telefónico para el formato de WhatsApp (@c.us)
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  if (!cleaned) return null;

  if (cleaned.length === 10 && (cleaned.startsWith('11') || cleaned.startsWith('15'))) {
    cleaned = '549' + (cleaned.startsWith('15') ? cleaned.substring(2) : cleaned);
  } else if (cleaned.startsWith('54') && !cleaned.startsWith('549')) {
    cleaned = '549' + cleaned.substring(2);
  } else if (cleaned.length === 10 && !cleaned.startsWith('54')) {
    cleaned = '549' + cleaned;
  }

  return `${cleaned}@c.us`;
}

/**
 * Proceso asíncrono secundario para enviar mensajes masivos en segundo plano
 */
async function procesarCampana(tenantId, mensajePlantilla, flyerUrl, clientes) {
  console.log(`\n🚀 [INICIO CAMPAÑA] Tenant: ${tenantId} | Total Clientes: ${clientes.length}`);
  if (flyerUrl) {
    console.log(`📸 Flyer adjunto: ${flyerUrl}`);
  }
  
  let enviados = 0;
  let fallidos = 0;

  // Preparar media de flyer si existe
  let mediaObj = null;
  if (flyerUrl) {
    try {
      mediaObj = await MessageMedia.fromUrl(flyerUrl, { unsafeMime: true });
    } catch (err) {
      console.error('⚠️ No se pudo descargar el flyer desde la URL provista:', err.message);
    }
  }

  for (let i = 0; i < clientes.length; i++) {
    const cliente = clientes[i];
    const chatId = formatPhoneNumber(cliente.telefono);
    const nombreCliente = cliente.nombre ? cliente.nombre.trim() : 'Cliente';

    if (!chatId) {
      console.warn(`[${i + 1}/${clientes.length}] ⚠️ Teléfono inválido para "${nombreCliente}": ${cliente.telefono}`);
      fallidos++;
      continue;
    }

    const mensajePersonalizado = mensajePlantilla.replace(/\{nombre\}/gi, nombreCliente);

    try {
      if (mediaObj) {
        await client.sendMessage(chatId, mediaObj, { caption: mensajePersonalizado });
      } else {
        await client.sendMessage(chatId, mensajePersonalizado);
      }
      enviados++;
      console.log(`[${i + 1}/${clientes.length}] ✅ Mensaje enviado a ${nombreCliente} (${chatId})`);
    } catch (err) {
      fallidos++;
      console.error(`[${i + 1}/${clientes.length}] ❌ Error al enviar a ${nombreCliente} (${chatId}):`, err.message);
    }

    // Pausa anti-ban aleatoria de 8 a 15 segundos entre envíos
    if (i < clientes.length - 1) {
      const minSec = 8;
      const maxSec = 15;
      const delayMs = Math.floor(Math.random() * ((maxSec - minSec) * 1000 + 1)) + (minSec * 1000);
      console.log(`   ⏳ Pausa anti-ban: esperando ${(delayMs / 1000).toFixed(1)}s antes del próximo envío...`);
      await new Promise(res => setTimeout(res, delayMs));
    }
  }

  console.log(`\n🏁 [CAMPAÑA FINALIZADA] Exitosos: ${enviados} | Fallidos: ${fallidos} | Total: ${clientes.length}\n`);
}

// ============================================================================
// ENDPOINTS DE LA API
// ============================================================================

/**
 * GET /api/status
 * Retorna el estado del servicio de WhatsApp y el QR en base64 si está disponible
 */
app.get('/api/status', (req, res) => {
  res.status(200).json({
    status: whatsappStatus, // 'DISCONNECTED' | 'QR_READY' | 'CONNECTED'
    qrCodeUrl: currentQrCodeDataUrl,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/logout
 * Cierra la sesión activa de WhatsApp Web y borra la autenticación guardada
 */
app.post('/api/logout', async (req, res) => {
  try {
    console.log('🔄 Solicitud de cierre de sesión de WhatsApp...');
    whatsappStatus = 'DISCONNECTED';
    currentQrCodeDataUrl = null;

    if (client) {
      try {
        await client.logout();
        await client.destroy();
      } catch (err) {
        console.warn('Advertencia al cerrar cliente WhatsApp:', err.message);
      }
    }

    // Eliminar carpeta de autenticación local si existe
    const authPath = path.join(__dirname, '.wwebjs_auth');
    if (fs.existsSync(authPath)) {
      try {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log('🗑️ Carpeta .wwebjs_auth eliminada.');
      } catch (err) {
        console.warn('No se pudo borrar carpeta .wwebjs_auth:', err.message);
      }
    }

    // Reiniciar cliente para volver a generar QR cuando el usuario quiera conectar
    setTimeout(() => {
      createWhatsAppClient();
    }, 1000);

    return res.status(200).json({
      success: true,
      message: 'Sesión de WhatsApp cerrada exitosamente.'
    });
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
    res.status(500).json({ error: 'Error al cerrar sesión de WhatsApp.' });
  }
});

/**
 * POST /api/restart
 * Reinicia la instancia del cliente WhatsApp para forzar la generación de un nuevo código QR
 */
app.post('/api/restart', async (req, res) => {
  try {
    console.log('🔄 Reiniciando cliente de WhatsApp...');
    whatsappStatus = 'DISCONNECTED';
    currentQrCodeDataUrl = null;

    if (client) {
      try {
        await client.destroy();
      } catch (err) {
        console.warn('Advertencia destruyendo cliente previa al reinicio:', err.message);
      }
    }

    setTimeout(() => {
      createWhatsAppClient();
    }, 1000);

    return res.status(200).json({
      success: true,
      message: 'Cliente de WhatsApp reiniciado correctamente.'
    });
  } catch (err) {
    console.error('Error al reiniciar cliente:', err);
    res.status(500).json({ error: 'Error al reiniciar cliente de WhatsApp.' });
  }
});

/**
 * POST /api/enviar-campana
 * Body: { tenantId: string, mensaje: string, flyerUrl?: string }
 */
app.post('/api/enviar-campana', async (req, res) => {
  try {
    const { tenantId, mensaje, flyerUrl } = req.body;

    if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
      return res.status(400).json({ 
        error: 'El campo "tenantId" es requerido.' 
      });
    }

    if (!mensaje || typeof mensaje !== 'string' || !mensaje.trim()) {
      return res.status(400).json({ 
        error: 'El campo "mensaje" es requerido.' 
      });
    }

    if (whatsappStatus !== 'CONNECTED') {
      return res.status(503).json({ 
        error: 'El servicio de WhatsApp aún no está conectado. Escaneá el código QR primero.' 
      });
    }

    console.log(`🔍 Buscando clientes en Supabase para tenant_id: ${tenantId}...`);
    const { data: clientes, error: dbError } = await supabase
      .from('clientes')
      .select('nombre, telefono')
      .eq('tenant_id', tenantId);

    if (dbError) {
      console.error('❌ Error al consultar clientes en Supabase:', dbError.message);
      return res.status(500).json({ 
        error: 'Error al consultar la base de datos de clientes.',
        details: dbError.message 
      });
    }

    if (!clientes || clientes.length === 0) {
      return res.status(404).json({ 
        message: 'No se encontraron clientes registrados para el tenant especificado.' 
      });
    }

    // Respuesta HTTP 200 Inmediata (No bloqueante)
    res.status(200).json({
      success: true,
      message: 'Campaña iniciada en segundo plano.',
      totalClientes: clientes.length,
      tiempoEstimadoMinutos: Math.ceil((clientes.length * 11.5) / 60)
    });

    // Ejecución del bucle de envío en segundo plano
    procesarCampana(tenantId, mensaje, flyerUrl, clientes).catch((err) => {
      console.error('💥 Error inesperado en campaña background:', err);
    });

  } catch (error) {
    console.error('💥 Error no controlado en /api/enviar-campana:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
/**
 * POST /api/enviar-notificacion
 * Body: { telefono: string, mensaje: string }
 * Envía un mensaje de notificación individual (ej: bienvenida / alta de comercio con instrucciones de ARCA)
 */
app.post('/api/enviar-notificacion', async (req, res) => {
  try {
    const { telefono, mensaje } = req.body;

    if (!telefono || typeof telefono !== 'string' || !telefono.trim()) {
      return res.status(400).json({ error: 'El campo "telefono" es requerido.' });
    }

    if (!mensaje || typeof mensaje !== 'string' || !mensaje.trim()) {
      return res.status(400).json({ error: 'El campo "mensaje" es requerido.' });
    }

    if (whatsappStatus !== 'CONNECTED') {
      return res.status(503).json({ error: 'El servicio de WhatsApp aún no está conectado.' });
    }

    const chatId = formatPhoneNumber(telefono);
    if (!chatId) {
      return res.status(400).json({ error: 'Formato de número telefónico inválido.' });
    }

    await client.sendMessage(chatId, mensaje);
    console.log(`✅ Notificación individual de bienvenida enviada a ${chatId}`);

    return res.status(200).json({
      success: true,
      message: 'Notificación enviada correctamente.'
    });
  } catch (error) {
    console.error('💥 Error en /api/enviar-notificacion:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor al enviar notificación.' });
  }
});

// Endpoint Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    whatsappStatus: whatsappStatus,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Microservicio de WhatsApp iniciado en http://localhost:${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   - GET  http://localhost:${PORT}/api/status`);
  console.log(`   - POST http://localhost:${PORT}/api/logout`);
  console.log(`   - POST http://localhost:${PORT}/api/enviar-campana`);
});
