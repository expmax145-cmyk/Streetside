import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import * as foodTrailService from '../services/foodTrail.service';

export const listFoodTrailsHandler = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await foodTrailService.listFoodTrails());
});

export const getFoodTrailHandler = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await foodTrailService.getFoodTrailById(req.params.id));
});

export const createFoodTrailHandler = asyncHandler(async (req: Request, res: Response) => {
  const trail = await foodTrailService.createFoodTrail(req.body, req.user?.id);
  sendSuccess(res, trail, 201);
});

export const updateFoodTrailHandler = asyncHandler(async (req: Request, res: Response) => {
  const trail = await foodTrailService.updateFoodTrail(req.params.id, req.body);
  sendSuccess(res, trail);
});

export const deleteFoodTrailHandler = asyncHandler(async (req: Request, res: Response) => {
  await foodTrailService.deleteFoodTrail(req.params.id);
  sendSuccess(res, { message: 'Food trail deleted' });
});