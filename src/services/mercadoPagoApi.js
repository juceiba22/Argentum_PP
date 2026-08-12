// Servicio para comunicarse con los endpoints serverless de Vercel (Mercado Pago Point Multi-tenant)

export const cobrarConPoint = async (total, pedidoId, mesa, tenantId) => {
  if (!tenantId) {
    throw new Error('Debes iniciar sesión con un comercio activo para realizar un cobro por terminal Point.');
  }

  try {
    const response = await fetch('/api/mercadopago/create-point-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        total,
        pedidoId,
        mesa,
        tenantId
      })
    });

    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const textErr = await response.text();
      console.warn('[MercadoPagoApi] Respuesta no-JSON del servidor:', textErr);
      data = { success: false, error: 'El servidor de cobro retorno una respuesta no valida. Verifica las credenciales de MP.' };
    }

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Fallo al iniciar cobro en la terminal Mercado Pago Point.');
    }

    return data.paymentIntent;
  } catch (error) {
    console.error("Error en servicio mercadoPagoApi (cobrarConPoint):", error);
    throw error;
  }
};

export const getPaymentIntentStatus = async (paymentIntentId, tenantId) => {
  if (!tenantId) {
    throw new Error('Tenant ID no especificado.');
  }

  try {
    const response = await fetch(`/api/mercadopago/get-payment-intent?payment_intent_id=${encodeURIComponent(paymentIntentId)}&tenantId=${encodeURIComponent(tenantId)}`);
    
    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { success: false, error: 'Respuesta no valida al consultar estado de pago.' };
    }

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Fallo al consultar el estado del pago en la terminal.');
    }

    return data.intent;
  } catch (error) {
    console.error("Error al consultar status del pago en MP:", error);
    throw error;
  }
};

export const cancelarPointPayment = async (paymentIntentId, tenantId) => {
  if (!tenantId) {
    throw new Error('Tenant ID no especificado.');
  }

  try {
    const response = await fetch('/api/mercadopago/cancel-point-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_intent_id: paymentIntentId, tenantId })
    });
    
    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { success: true };
    }
    return data;
  } catch (error) {
    console.error("Error al cancelar en servicio mercadoPagoApi:", error);
    throw error;
  }
};
