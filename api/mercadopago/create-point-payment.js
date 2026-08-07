import { Order } from 'mercadopago';
import crypto from 'crypto';
import { getMercadoPagoCredentialsForTenant } from './mp-client.js';

export default async function handler(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido (solo POST).' });
  }

  try {
    const { total, pedidoId, tenantId } = req.body || {};

    if (!total || !pedidoId) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros obligatorios: total y/o pedidoId' });
    }

    // Resolver credenciales y cliente MP dinámico para este tenant
    let mpCredentials;
    try {
      mpCredentials = await getMercadoPagoCredentialsForTenant(tenantId);
    } catch (credErr) {
      return res.status(200).json({
        success: false,
        error: credErr.message || 'El POS de Mercado Pago no está configurado para este comercio.'
      });
    }

    const { client, deviceId } = mpCredentials;

    const order = new Order(client);

    const requestOptions = {
      idempotencyKey: crypto.randomUUID()
    };
    
    const body = {
      type: "point",
      external_reference: String(pedidoId),
      transactions: {
        payments: [{ amount: String(Number(total).toFixed(2)) }]
      },
      config: {
        point: {
          terminal_id: deviceId,
          print_on_terminal: "no_ticket"
        }
      },
      description: `Cobro POS - Pedido #${String(pedidoId).substring(0, 8)}`
    };

    const response = await order.create({ body, requestOptions });

    return res.status(200).json({
      success: true,
      paymentIntent: response
    });

  } catch (error) {
    console.error("Error al crear Orden en MP Point:", error);
    return res.status(200).json({
      success: false,
      error: error.message || 'Error al comunicarse con Mercado Pago Point.'
    });
  }
}
