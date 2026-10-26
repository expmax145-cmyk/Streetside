import { Router } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();

// Return 503 when MongoDB is not connected
router.get('/', (_req, res) => {
  const dbStateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const readyState = mongoose.connection.readyState;
  const isHealthy = readyState === 1;

  const body = {
    status: isHealthy ? 'ok' : 'degraded',
    uptimeSeconds: Math.round(process.uptime()),
    db: dbStateNames[readyState] || 'unknown',
  };

  if (!isHealthy) {
    return res.status(503).json({ success: false, data: body });
  }

  return sendSuccess(res, body);
});

export default router;
