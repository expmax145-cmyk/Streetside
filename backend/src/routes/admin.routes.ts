import { Router } from 'express';
import { param, body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  listUsersHandler,
  patchUserStatusHandler,
  listVendorsAdminHandler,
  patchVendorStatusHandler,
  listPendingVendorsHandler,
  approveVendorHandler,
  rejectVendorHandler,
  listReportsHandler,
  patchReportHandler,
} from '../controllers/admin.controller';

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/users', listUsersHandler);
router.patch(
  '/users/:id/status',
  param('id').isMongoId(),
  body('status').isIn(['active', 'suspended']),
  validate,
  patchUserStatusHandler,
);

// admin vendor management with activate/deactivate
router.get('/vendors', listVendorsAdminHandler);
router.patch(
  '/vendors/:id/status',
  param('id').isMongoId(),
  body('isActive').isBoolean(),
  validate,
  patchVendorStatusHandler,
);

// vendor approval gate
router.get('/vendors/pending', listPendingVendorsHandler);
router.patch('/vendors/:id/approve', param('id').isMongoId(), validate, approveVendorHandler);
router.patch(
  '/vendors/:id/reject',
  param('id').isMongoId(),
  body('reason').optional().isString().isLength({ max: 300 }),
  validate,
  rejectVendorHandler,
);

router.get('/reports', listReportsHandler);
router.patch(
  '/reports/:id',
  param('id').isMongoId(),
  body('status').isIn(['resolved', 'dismissed']),
  validate,
  patchReportHandler,
);

export default router;
