import { Router } from 'express';
import { param, body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { TRAIL_DIFFICULTIES } from '../types/enums';
import {
  listFoodTrailsHandler,
  getFoodTrailHandler,
  createFoodTrailHandler,
  updateFoodTrailHandler,
  deleteFoodTrailHandler,
} from '../controllers/foodTrail.controller';

const router = Router();

const stopsValidation = (opts: { optional?: boolean } = {}) => {
  const wrap = <T extends { optional: () => T }>(chain: T) => (opts.optional ? chain.optional() : chain);
  return [
    wrap(body('stops').isArray({ min: 1 })).withMessage('A food trail needs at least one stop'),
    body('stops.*.order').if(body('stops').exists()).isInt({ min: 1 }),
    body('stops.*.vendor').if(body('stops').exists()).isMongoId().withMessage('Each stop needs a valid vendor id'),
    body('stops.*.note').if(body('stops').exists()).optional().isString().trim().isLength({ max: 300 }),
  ];
};

const foodTrailBodyValidation = [
  body('name').isString().trim().isLength({ min: 2, max: 150 }),
  body('description').isString().trim().isLength({ min: 1, max: 300 }),
  body('image').isString().trim().notEmpty(),
  body('duration').isString().trim().notEmpty(),
  body('distance').isString().trim().notEmpty(),
  body('difficulty').isIn(TRAIL_DIFFICULTIES).withMessage('Invalid difficulty'),
  ...stopsValidation(),
];

const foodTrailUpdateValidation = [
  body('name').optional().isString().trim().isLength({ min: 2, max: 150 }),
  body('description').optional().isString().trim().isLength({ min: 1, max: 300 }),
  body('image').optional().isString().trim().notEmpty(),
  body('duration').optional().isString().trim().notEmpty(),
  body('distance').optional().isString().trim().notEmpty(),
  body('difficulty').optional().isIn(TRAIL_DIFFICULTIES).withMessage('Invalid difficulty'),
  ...stopsValidation({ optional: true }),
];

router.get('/', listFoodTrailsHandler);
router.get('/:id', param('id').isMongoId(), validate, getFoodTrailHandler);

router.post('/', authenticate, authorize('admin'), foodTrailBodyValidation, validate, createFoodTrailHandler);
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  param('id').isMongoId(),
  foodTrailUpdateValidation,
  validate,
  updateFoodTrailHandler,
);
router.delete('/:id', authenticate, authorize('admin'), param('id').isMongoId(), validate, deleteFoodTrailHandler);

export default router;