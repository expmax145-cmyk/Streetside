import { Router } from 'express';
import { isConnected, query } from '../db/engine';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();

// Returns 503 when the database is not reachable.
router.get('/', async (_req, res) => {
  let dbState = 'disconnected';
  if (isConnected()) {
    try {
      await query('select 1');
      dbState = 'connected';
    } catch {
      dbState = 'error';
    }
  }
  const isHealthy = dbState === 'connected';

  const body = {
    status: isHealthy ? 'ok' : 'degraded',
    uptimeSeconds: Math.round(process.uptime()),
    db: dbState,
  };

  if (!isHealthy) {
    return res.status(503).json({ success: false, data: body });
  }
  return sendSuccess(res, body);
});

export default router;
