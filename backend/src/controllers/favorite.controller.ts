import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/ApiError';
import * as favoriteService from '../services/favorite.service';

export const listFavoritesHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const vendors = await favoriteService.listFavoriteVendors(req.user.id);
  sendSuccess(res, vendors);
});

export const addFavoriteHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const created = await favoriteService.addFavorite(req.user.id, req.params.vendorId);
  sendSuccess(res, { message: created ? 'Added to favorites' : 'Already in favorites' }, created ? 201 : 200);
});

export const removeFavoriteHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await favoriteService.removeFavorite(req.user.id, req.params.vendorId);
  sendSuccess(res, { message: 'Removed from favorites' });
});
