import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth.middleware';
import { createReportHandler } from '../controllers/report.controller';

const router = Router();

router.post('/', authenticate, body('type').isIn(['review','vendor','user']), body('targetId').isMongoId(), body('reason').isString().isLength({ min: 1, max: 500 }), validate, createReportHandler);

export default router;
