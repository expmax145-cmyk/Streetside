import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize, attachUserIfPresent } from '../middleware/auth.middleware';
import { CUISINE_TYPES, FOOD_CATEGORIES, VENDOR_VEG_STATUSES } from '../types/enums';
import {
  listVendorsHandler,
  getVendorHandler,
  createVendorHandler,
  updateVendorHandler,
  deleteVendorHandler,
} from '../controllers/vendor.controller';

const router = Router();

const listQueryValidation = [
  query('category').optional().isIn(FOOD_CATEGORIES).withMessage('Invalid category'),
  query('veg').optional().isIn(VENDOR_VEG_STATUSES).withMessage('Invalid veg status'),
  query('sort')
    .optional()
    .isIn(['rating', 'popularity', 'distance', 'price-low', 'price-high', 'newest'])
    .withMessage('Invalid sort value'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
  query('userLat').optional().isFloat({ min: -90, max: 90 }),
  query('userLng').optional().isFloat({ min: -180, max: 180 }),
];

router.get('/', listQueryValidation, validate, attachUserIfPresent, listVendorsHandler);

router.get('/:id', param('id').isUUID().withMessage('Invalid vendor id'), validate, attachUserIfPresent, getVendorHandler);

// Optional secondary-contact/online-presence fields, shared by both the
// create and update validation chains — same rules either way since
// they're optional in both cases, just not present in older vendors.
const businessContactValidation = [
  body('secondaryPhone').optional().isString().trim().isLength({ max: 30 }),
  body('website').optional({ checkFalsy: true }).isURL().withMessage('Website must be a valid URL'),
  body('socialLinks').optional().isObject(),
  body('socialLinks.instagram').optional({ checkFalsy: true }).isString().trim().isLength({ max: 200 }),
  body('socialLinks.facebook').optional({ checkFalsy: true }).isString().trim().isLength({ max: 200 }),
  body('socialLinks.whatsapp').optional({ checkFalsy: true }).isString().trim().isLength({ max: 30 }),
  body('manualClosed').optional().isBoolean().withMessage('manualClosed must be true or false'),
];

const vendorBodyValidation = [
  body('name').isString().trim().isLength({ min: 2, max: 120 }),
  body('cuisine').isIn(CUISINE_TYPES).withMessage('Invalid cuisine'),
  body('categories').isArray({ min: 0 }),
  body('categories.*').isIn(FOOD_CATEGORIES).withMessage('Invalid category in categories[]'),
  body('description').isString().trim().isLength({ min: 10, max: 300 }),
  body('image').isString().trim().notEmpty(),
  body('location.address').isString().trim().notEmpty(),
  body('location.area').isString().trim().notEmpty(),
  body('location.lat').isFloat({ min: -90, max: 90 }),
  body('location.lng').isFloat({ min: -180, max: 180 }),
  body('hours.open').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('hours.open must be HH:MM (24h)'),
  body('hours.close').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('hours.close must be HH:MM (24h)'),
  body('phone').isString().trim().notEmpty(),
  body('veg').isIn(VENDOR_VEG_STATUSES).withMessage('Invalid veg status'),
  ...businessContactValidation,
];

router.post('/', authenticate, authorize('vendor', 'admin'), vendorBodyValidation, validate, createVendorHandler);

// PUT allows a partial update (only the fields actually being changed),
// so every check here is .optional() — but any field that IS present
// still gets validated, rather than skipping validation on updates
// entirely.
const vendorUpdateValidation = [
  body('name').optional().isString().trim().isLength({ min: 2, max: 120 }),
  body('cuisine').optional().isIn(CUISINE_TYPES).withMessage('Invalid cuisine'),
  body('categories').optional().isArray(),
  body('categories.*').optional().isIn(FOOD_CATEGORIES).withMessage('Invalid category in categories[]'),
  body('description').optional().isString().trim().isLength({ min: 10, max: 300 }),
  body('image').optional().isString().trim().notEmpty(),
  body('location').optional().isObject(),
  body('location.address').optional().isString().trim().notEmpty(),
  body('location.area').optional().isString().trim().notEmpty(),
  body('location.lat').optional().isFloat({ min: -90, max: 90 }),
  body('location.lng').optional().isFloat({ min: -180, max: 180 }),
  body('hours').optional().isObject(),
  body('hours.open').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('hours.open must be HH:MM (24h)'),
  body('hours.close').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('hours.close must be HH:MM (24h)'),
  body('phone').optional().isString().trim().notEmpty(),
  body('veg').optional().isIn(VENDOR_VEG_STATUSES).withMessage('Invalid veg status'),
  ...businessContactValidation,
];

router.put(
  '/:id',
  authenticate,
  authorize('vendor', 'admin'),
  param('id').isUUID(),
  vendorUpdateValidation,
  validate,
  updateVendorHandler,
);

router.delete(
  '/:id',
  authenticate,
  authorize('vendor', 'admin'),
  param('id').isUUID(),
  validate,
  deleteVendorHandler,
);

export default router;
