import { Router } from 'express';
import { param, body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { listEventsHandler, getEventHandler, createEventHandler, updateEventHandler, deleteEventHandler } from '../controllers/event.controller';

const router = Router();

router.get('/', listEventsHandler);
router.get('/:id', param('id').isUUID(), validate, getEventHandler);

router.post('/', authenticate, authorize('admin'), body('name').isString().trim().notEmpty(), validate, createEventHandler);
router.put('/:id', authenticate, authorize('admin'), param('id').isUUID(), body().optional(), validate, updateEventHandler);
router.delete('/:id', authenticate, authorize('admin'), param('id').isUUID(), validate, deleteEventHandler);

export default router;
