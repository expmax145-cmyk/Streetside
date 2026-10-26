import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/ApiError';
import * as menuService from '../services/menu.service';

export const listVendorMenuHandler = asyncHandler(async (req: Request, res: Response) => {
  const items = await menuService.listMenuForVendor(req.params.vendorId);
  sendSuccess(res, items);
});

export const addMenuItemHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const item = await menuService.addMenuItem(req.params.vendorId, { id: req.user.id, role: req.user.role }, req.body);
  sendSuccess(res, item, 201);
});

export const updateMenuItemHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const item = await menuService.updateMenuItem(req.params.id, { id: req.user.id, role: req.user.role }, req.body);
  sendSuccess(res, item);
});

export const deleteMenuItemHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await menuService.deleteMenuItem(req.params.id, { id: req.user.id, role: req.user.role });
  sendSuccess(res, { message: 'Menu item deleted' });
});
