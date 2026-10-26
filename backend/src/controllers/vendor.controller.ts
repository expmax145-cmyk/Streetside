import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/ApiError';
import * as vendorService from '../services/vendor.service';
import type { CuisineType, FoodCategory, VendorVegStatus } from '../types/enums';

function parseBool(v: unknown): boolean | undefined {
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return undefined;
}

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export const listVendorsHandler = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query;
  const result = await vendorService.listVendors({
    search: typeof q.search === 'string' ? q.search : typeof q.q === 'string' ? q.q : undefined,
    category: q.category as FoodCategory | undefined,
    veg: q.veg as VendorVegStatus | undefined,
    vegOnly: parseBool(q.vegOnly),
    openNow: parseBool(q.openNow),
    sort: q.sort as vendorService.VendorListQuery['sort'],
    userLat: parseNum(q.userLat),
    userLng: parseNum(q.userLng),
    maxDistanceKm: parseNum(q.maxDistanceKm),
    page: parseNum(q.page),
    limit: parseNum(q.limit),
    includeInactive: parseBool(q.includeInactive) && req.user?.role === 'admin',
  });
  sendSuccess(res, result.items, 200, { pagination: result.pagination });
});

export const getVendorHandler = asyncHandler(async (req: Request, res: Response) => {
  // pass requester info for view deduplication
  const requesterIp = req.ip ?? 'unknown';
  const vendor = await vendorService.getVendorById(req.params.id, {
    populateMenu: true,
    requesterIp,
    requesterId: req.user?.id,
    requesterRole: req.user?.role,
  });
  sendSuccess(res, vendor);
});

export const createVendorHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  // pass raw body — sanitizeVendorUpdate inside service handles stripping
  const vendor = await vendorService.createVendor(
    req.body as vendorService.CreateVendorInput,
    { id: req.user.id, role: req.user.role },
  );
  sendSuccess(res, vendor, 201);
});

export const updateVendorHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  // pass raw body — sanitizeVendorUpdate inside service does the stripping
  const vendor = await vendorService.updateVendor(
    req.params.id,
    req.body as Record<string, unknown>,
    { id: req.user.id, role: req.user.role },
  );
  sendSuccess(res, vendor);
});

export const deleteVendorHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await vendorService.deleteVendor(req.params.id, { id: req.user.id, role: req.user.role });
  sendSuccess(res, { message: 'Vendor deactivated' });
});
