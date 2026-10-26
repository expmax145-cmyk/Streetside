import { Router } from 'express';
import { param, body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth.middleware';
import { writeLimiter } from '../middleware/rateLimiter';
import { uploadMediaHandler, getMediaHandler } from '../controllers/media.controller';

const router = Router();

router.post(
  '/',
  authenticate,
  writeLimiter,
  body('dataUri').isString().isLength({ min: 20, max: 3_000_000 }),
  validate,
  uploadMediaHandler,
);

// Public read — image URLs are embedded in public vendor/menu pages
router.get('/:id', param('id').isMongoId(), validate, getMediaHandler);

export default router;
