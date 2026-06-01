import { MercadoPagoConfig, PaymentIntent } from 'mercadopago';

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

  // 1. Inicializar SDK de Mercado Pago
  // Vercel utilizará process.env.MP_ACCESS_TOKEN de las variables de entorno de producción
  const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-TU_ACCESS_TOKEN_AQUI' 
  });

  const { total, pedidoId, mesa } = req.body;

  if (!total || !pedidoId) {
    return res.status(400).json({ success: false, error: 'Faltan parámetros: total y/o pedidoId' });
  }

  try {
    // 2. Crear una instancia de PaymentIntent para Point
    const paymentIntent = new PaymentIntent(client);

    // 3. Obtener el ID del dispositivo (Point)
    // En un entorno real, puedes pasarlo desde el frontend o tenerlo fijo aquí.
    const DEVICE_ID = process.env.MP_POINT_DEVICE_ID || 'TU_DEVICE_ID';

    // 4. Crear la intención de pago
    // Nota: El SDK de MP para PaymentIntent en Point espera un payload específico
    const requestOptions = {
      device_id: DEVICE_ID,
      body: {
        amount: Number(total),
        description: `Cobro Mesa ${mesa || 'S/D'} - Pedido ${pedidoId}`,
        payment: {
          installments: 1,
          type: "default", // Permite débito, crédito, QR y billetera
        },
        additional_info: {
          external_reference: pedidoId,
          print_on_terminal: true // Muestra comprobante
        }
      }
    };

    // Lanzar el intento al posnet
    const response = await paymentIntent.create(requestOptions);

    // Retornamos el objeto al frontend
    return res.status(200).json({
      success: true,
      paymentIntent: response
    });

  } catch (error) {
    console.error("Error al crear Payment Intent en MP Point:", error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno al comunicarse con Mercado Pago'
    });
  }
}
