import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/ApiError';
import * as reviewService from '../services/review.service';

export const listVendorReviewsHandler = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const result = await reviewService.listReviewsForVendor(req.params.vendorId, { page, limit });
  sendSuccess(res, result.items, 200, { pagination: result.pagination });
});

export const listMyReviewsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const reviews = await reviewService.listReviewsByUser(req.user.id);
  sendSuccess(res, reviews);
});

export const createReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const review = await reviewService.createReview(req.params.vendorId, req.user.id, {
    rating: req.body.rating,
    comment: req.body.comment,
  });
  sendSuccess(res, review, 201);
});

export const updateReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const review = await reviewService.updateReview(
    req.params.id,
    { id: req.user.id, role: req.user.role },
    { rating: req.body.rating, comment: req.body.comment },
  );
  sendSuccess(res, review);
});

export const deleteReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await reviewService.deleteReview(req.params.id, { id: req.user.id, role: req.user.role });
  sendSuccess(res, { message: 'Review deleted' });
});
