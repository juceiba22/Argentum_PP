import { MercadoPagoConfig, Order } from 'mercadopago';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Vercel Serverless Function
export default async function handler(req, res) {
  // Soporte para CORS (pre-flight)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Restricción de método
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { total, pedidoId, tenantId } = req.body;

  if (!total || !pedidoId) {
    return res.status(400).json({ success: false, error: 'Faltan parámetros: total y/o pedidoId' });
  }

  let accessToken = process.env.MP_ACCESS_TOKEN;
  let deviceId = process.env.MP_POINT_DEVICE_ID;

  if (tenantId) {
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('mp_access_token, mp_point_device_id')
        .eq('id', tenantId)
        .single();
        
      if (tenant) {
        if (tenant.mp_access_token) accessToken = tenant.mp_access_token;
        if (tenant.mp_point_device_id) deviceId = tenant.mp_point_device_id;
      }
    } catch (err) {
      console.warn("Error consultando tenant para mercado pago:", err);
    }
  }

  // 1. Inicializar SDK de Mercado Pago
  const client = new MercadoPagoConfig({ 
    accessToken: accessToken || 'APP_USR-TU_ACCESS_TOKEN_AQUI' 
  });

  try {
    // 2. Crear una instancia de Order
    const order = new Order(client);

    // 3. Obtener el ID del dispositivo (Point)
    const DEVICE_ID = deviceId || 'TU_DEVICE_ID';

    // 4. Crear la Orden
    const requestOptions = {
      idempotencyKey: crypto.randomUUID()
    };
    
    const body = {
      type: "point",
      external_reference: pedidoId,
      transactions: {
        payments: [{ amount: String(Number(total).toFixed(2)) }]
      },
      config: {
        point: {
          terminal_id: DEVICE_ID,
          print_on_terminal: "no_ticket"
        }
      },
      description: `Venta de Carnicería - Pedido ${pedidoId}`
    };

    // Lanzar el intento al posnet
    const response = await order.create({ body, requestOptions });

    // Retornamos el objeto al frontend
    return res.status(200).json({
      success: true,
      paymentIntent: response
    });

  } catch (error) {
    console.error("Error al crear Orden en MP Point:", error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno al comunicarse con Mercado Pago'
    });
  }
}
