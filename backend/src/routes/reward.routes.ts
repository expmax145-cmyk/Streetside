import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMyRewardsHandler } from '../controllers/reward.controller';

const router = Router();

router.get('/me', authenticate, getMyRewardsHandler);

export default router;
