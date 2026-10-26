import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth.middleware';
import { FOOD_CATEGORIES, MENU_ITEM_VEG_STATUSES } from '../types/enums';
import {
  listVendorMenuHandler,
  addMenuItemHandler,
  updateMenuItemHandler,
  deleteMenuItemHandler,
} from '../controllers/menu.controller';

// Factory functions, not shared chain instances — see review.routes.ts
// for why reusing a single ValidationChain object across a required
// (POST) and an optional (PUT) route is a real bug, not just a style
// preference.
function menuItemValidation(opts: { optional?: boolean } = {}) {
  const wrap = <T extends { optional: () => T }>(chain: T) => (opts.optional ? chain.optional() : chain);
  return [
    wrap(body('name').isString().trim().isLength({ min: 1, max: 120 })),
    wrap(body('description').isString().trim().isLength({ max: 500 })),
    wrap(body('price').isFloat({ min: 0 }).withMessage('price must be >= 0')),
    wrap(body('category').isIn(FOOD_CATEGORIES).withMessage('Invalid category')),
    wrap(body('veg').isIn(MENU_ITEM_VEG_STATUSES).withMessage('Invalid veg value')),
    wrap(body('image').isString().trim().notEmpty()),
    body('popular').optional().isBoolean(),
    body('available').optional().isBoolean(),
  ];
}

/** Mounted at /api/vendors/:vendorId/menu (see app.ts). */
export const vendorMenuRouter = Router({ mergeParams: true });

vendorMenuRouter.get('/', param('vendorId').isMongoId(), validate, listVendorMenuHandler);

vendorMenuRouter.post(
  '/',
  authenticate,
  param('vendorId').isMongoId(),
  menuItemValidation(),
  validate,
  addMenuItemHandler,
);

/** Mounted at /api/menu (see app.ts). */
const menuRouter = Router();

menuRouter.put(
  '/:id',
  authenticate,
  param('id').isMongoId(),
  menuItemValidation({ optional: true }),
  validate,
  updateMenuItemHandler,
);

menuRouter.delete('/:id', authenticate, param('id').isMongoId(), validate, deleteMenuItemHandler);

export default menuRouter;
