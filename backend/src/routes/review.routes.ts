import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth.middleware';
import {
  listVendorReviewsHandler,
  listMyReviewsHandler,
  createReviewHandler,
  updateReviewHandler,
  deleteReviewHandler,
} from '../controllers/review.controller';

// IMPORTANT: these must be FUNCTIONS that build a fresh ValidationChain
// each time, not shared chain instances. express-validator's ValidationChain
// is a mutable builder — calling `.optional()` on a chain object mutates
// that same instance. Reusing one chain object across two different
// route registrations (POST requires rating; PUT's rating is optional)
// would make .optional() on the PUT route silently leak into the POST
// route's validation too, since they'd be the exact same object.
const ratingValidation = (opts: { optional?: boolean } = {}) => {
  const chain = body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be an integer 1-5');
  return opts.optional ? chain.optional() : chain;
};
const commentValidation = (opts: { optional?: boolean } = {}) => {
  const chain = body('comment').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('comment must be 1-1000 characters');
  return opts.optional ? chain.optional() : chain;
};

/**
 * Mounted at /api/vendors/:vendorId/reviews (see app.ts) — GET is public,
 * POST requires auth. Kept as its own router (rather than folded into
 * vendor.routes.ts) so the flat /api/reviews/:id router below can share
 * the same controller/service without a circular import between the two
 * route modules.
 */
export const vendorReviewsRouter = Router({ mergeParams: true });

vendorReviewsRouter.get(
  '/',
  param('vendorId').isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validate,
  listVendorReviewsHandler,
);

vendorReviewsRouter.post(
  '/',
  authenticate,
  param('vendorId').isMongoId(),
  ratingValidation(),
  commentValidation(),
  validate,
  createReviewHandler,
);

/** Mounted at /api/reviews (see app.ts) — both routes require auth; ownership is enforced in the service. */
const reviewRouter = Router();

// Registered before the /:id routes below — Express matches routes in
// registration order, and "mine" would otherwise be captured by the
// :id param patterns (there's no GET /:id here today, but keeping this
// first avoids that trap if one is ever added).
reviewRouter.get('/mine', authenticate, listMyReviewsHandler);

reviewRouter.put(
  '/:id',
  authenticate,
  param('id').isMongoId(),
  ratingValidation({ optional: true }),
  commentValidation({ optional: true }),
  validate,
  updateReviewHandler,
);

reviewRouter.delete('/:id', authenticate, param('id').isMongoId(), validate, deleteReviewHandler);

export default reviewRouter;
