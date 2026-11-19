import { Router } from 'express';
import { param, body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize, attachUserIfPresent } from '../middleware/auth.middleware';
import { listOffersHandler, listVendorOffersHandler, createOfferHandler, updateOfferHandler, deleteOfferHandler } from '../controllers/offer.controller';

export const vendorOffersRouter = Router({ mergeParams: true });
vendorOffersRouter.get('/', attachUserIfPresent, param('vendorId').isMongoId(), validate, listVendorOffersHandler);
vendorOffersRouter.post('/', authenticate, authorize('vendor', 'admin'), param('vendorId').isMongoId(), body('title').isString().trim().isLength({ min: 1 }), validate, createOfferHandler);

const offerRouter = Router();
offerRouter.get('/', listOffersHandler);
offerRouter.post('/', authenticate, authorize('vendor', 'admin'), body('title').isString().trim().isLength({ min: 1 }), validate, createOfferHandler);
offerRouter.put('/:id', authenticate, authorize('vendor', 'admin'), param('id').isMongoId(), body().optional(), validate, updateOfferHandler);
offerRouter.delete('/:id', authenticate, authorize('vendor', 'admin'), param('id').isMongoId(), validate, deleteOfferHandler);

export default offerRouter;
