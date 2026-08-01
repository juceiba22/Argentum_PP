// Script de prueba rápida para disparar la campaña sin necesidad de Postman
const TENANT_ID = "00000000-0000-0000-0000-000000000001"; // Reemplazá por tu tenant_id real de Supabase
const MENSAJE = "¡Hola {nombre}! Ya subimos los cortes de esta semana. Mirá las promos acá: https://argentum-pp.vercel.app/promociones";

async function dispararCampana() {
  try {
    console.log('📡 Enviando solicitud para iniciar campaña...');
    
    const response = await fetch('http://localhost:3001/api/enviar-campana', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tenantId: TENANT_ID,
        mensaje: MENSAJE
      })
    });

    const data = await response.json();
    console.log('\n📩 Respuesta del servidor:');
    console.log(data);

  } catch (error) {
    console.error('❌ Error al conectar con el servidor:', error.message);
  }
}

dispararCampana();
