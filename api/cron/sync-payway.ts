import { PaywaySftpService } from '../services/PaywaySftpService';

export default async function handler(req: any, res: any) {
  // Aseguramos que solo sea GET
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  // Verificamos el token de seguridad
  // Vercel Cron inyecta automáticamente el token si configuraste CRON_SECRET en el entorno
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET no está configurado en el entorno.');
    return res.status(500).json({ success: false, error: 'Configuración de seguridad faltante en el servidor.' });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }

  try {
    const service = new PaywaySftpService();
    const result = await service.syncLatestTransactions();

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('Error no controlado en Cron de Payway:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
