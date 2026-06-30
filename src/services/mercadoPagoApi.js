// Servicio para comunicarse con el endpoint serverless de Vercel (Mercado Pago Point)

export const cobrarConPoint = async (total, pedidoId, mesa) => {
  try {
    // Apuntamos a la ruta local/relativa que Vercel expone para la carpeta /api
    const response = await fetch('/api/mercadopago/create-point-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        total,
        pedidoId,
        mesa
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Fallo al iniciar cobro en el terminal Point');
    }

    return data.paymentIntent;
  } catch (error) {
    console.error("Error en servicio mercadoPagoApi:", error);
    throw error;
  }
};

export const getPaymentIntentStatus = async (paymentIntentId) => {
  try {
    const response = await fetch(`/api/mercadopago/get-payment-intent?payment_intent_id=${paymentIntentId}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Fallo al consultar el estado del pago');
    }

    return data.intent;
  } catch (error) {
    console.error("Error al consultar status del pago en MP:", error);
    throw error;
  }
};
