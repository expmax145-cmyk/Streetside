import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/ApiError';
import * as offerService from '../services/offer.service';

export const listOffersHandler = asyncHandler(async (_req: Request, res: Response) => {
  const offers = await offerService.listActiveOffers();
  sendSuccess(res, offers);
});

export const listVendorOffersHandler = asyncHandler(async (req: Request, res: Response) => {
  const vendorId = req.params.vendorId;
  // Only the offer's own vendor (or an admin) can see inactive/expired
  // offers for management purposes — everyone else gets the public,
  // currently-active view regardless of what they pass in the query.
  const isOwnerOrAdmin = req.user?.role === 'admin' || (req.user?.role === 'vendor' && req.user.vendorId === vendorId);
  const includeInactive = req.query.includeInactive === 'true' && isOwnerOrAdmin;
  const offers = await offerService.listOffersForVendor(vendorId, { includeInactive });
  sendSuccess(res, offers);
});

export const createOfferHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const offer = await offerService.createOffer(req.body.vendor ?? req.params.vendorId ?? req.body.vendor, { id: req.user.id, role: req.user.role }, req.body);
  sendSuccess(res, offer, 201);
});

export const updateOfferHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const offer = await offerService.updateOffer(req.params.id, { id: req.user.id, role: req.user.role }, req.body);
  sendSuccess(res, offer);
});

export const deleteOfferHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await offerService.deleteOffer(req.params.id, { id: req.user.id, role: req.user.role });
  sendSuccess(res, { message: 'Offer deactivated' });
});
