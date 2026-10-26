import { type FilterQuery, Types } from 'mongoose';
import { Vendor, type IVendor } from '../models/Vendor.model';
import { User } from '../models/User.model';
import { ApiError } from '../utils/ApiError';
import { isVendorOpenNow } from '../utils/vendorHours';
import { haversineDistanceKm } from '../utils/distance';
import type { CuisineType, FoodCategory, VendorVegStatus } from '../types/enums';

export interface VendorListQuery {
  search?: string;
  category?: FoodCategory;
  veg?: VendorVegStatus;
  vegOnly?: boolean;
  openNow?: boolean;
  sort?: 'rating' | 'popularity' | 'distance' | 'price-low' | 'price-high' | 'newest';
  userLat?: number;
  userLng?: number;
  maxDistanceKm?: number;
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const IN_MEMORY_FILTER_CAP = 2000; // raised to handle >50 vendors

// Explicit owner-writable allowlist — never trust req.body fields
// for protected server-owned fields (rating, reviewCount, popularity,
// views, isActive, owner, location.point).
// fssaiLicenseNumber is owner-writable (a self-reported license
// number); hygieneRating/hygieneVerified are NOT in this list — those
// represent StreetSide's own verification and are admin-only, handled
// separately below.
const OWNER_WRITABLE_FIELDS = new Set([
  'name', 'cuisine', 'categories', 'description', 'longDescription',
  'image', 'logo', 'priceRange', 'location', 'hours', 'phone',
  'secondaryPhone', 'website', 'socialLinks', 'manualClosed', 'veg', 'specialties',
  'fssaiLicenseNumber',
]);

// admin-only verification fields, separate from OWNER_WRITABLE_FIELDS
const ADMIN_ONLY_FIELDS = new Set(['hygieneRating', 'hygieneVerified']);

export function sanitizeVendorUpdate(
  raw: Record<string, unknown>,
  role: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (OWNER_WRITABLE_FIELDS.has(key)) {
      out[key] = val;
    }
  }
  // Only admins may set isActive
  if (role === 'admin' && 'isActive' in raw) {
    out.isActive = raw.isActive;
  }
  // hygiene verification is admin-only
  if (role === 'admin') {
    for (const key of ADMIN_ONLY_FIELDS) {
      if (key in raw) out[key] = raw[key];
    }
  }
  // location.point is always computed server-side in the pre-save hook —
  // never accepted from the client regardless of role.
  if (out.location && typeof out.location === 'object') {
    const loc = { ...(out.location as Record<string, unknown>) };
    delete loc.point;
    out.location = loc;
  }
  return out;
}

export async function listVendors(query: VendorListQuery): Promise<PaginatedResult<IVendor & { distanceKm?: number }>> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));

  const filter: Record<string, unknown> = {};
  if (!query.includeInactive) {
    filter.isActive = true;
    // public listings only ever show approved vendors — a
    // pending or rejected listing is invisible to everyone except its
    // owner (via a dedicated lookup) and admins (via listVendorsAdmin).
    filter.approvalStatus = 'approved';
  }
  if (query.category) {
    filter.categories = query.category;
  }
  if (query.vegOnly) {
    filter.veg = 'pure-veg';
  } else if (query.veg) {
    filter.veg = query.veg;
  }
  if (query.search?.trim()) {
    filter.$text = { $search: query.search.trim() };
  }

  // Deterministic default sort with _id tiebreaker
  let cursor = Vendor.find(filter as FilterQuery<IVendor>)
    .populate('menu')
    .limit(IN_MEMORY_FILTER_CAP);

  if (query.sort === 'rating') cursor = cursor.sort({ rating: -1, _id: 1 });
  else if (query.sort === 'newest') cursor = cursor.sort({ createdAt: -1, _id: 1 });
  else if (query.sort === 'popularity' || (!query.sort && !query.search)) {
    cursor = cursor.sort({ popularity: -1, _id: 1 });
  } else {
    cursor = cursor.sort({ popularity: -1, _id: 1 });
  }

  let vendors = await cursor.exec();

  if (query.openNow) {
    vendors = vendors.filter((v) => isVendorOpenNow(v.hours));
  }

  const hasUserLocation = typeof query.userLat === 'number' && typeof query.userLng === 'number';
  // Return plain objects with distanceKm so toJSON() doesn't drop it
  type VendorWithDist = IVendor & { distanceKm?: number };
  let withDistance: VendorWithDist[] = vendors as VendorWithDist[];

  if (hasUserLocation) {
    const origin = { lat: query.userLat as number, lng: query.userLng as number };
    withDistance = vendors.map((v) => {
      const d = haversineDistanceKm(origin, { lat: v.location.lat, lng: v.location.lng });
      const plain = { ...(v.toJSON() as object), distanceKm: d } as VendorWithDist;
      return plain;
    });
    if (query.maxDistanceKm) {
      withDistance = withDistance.filter((v) => (v.distanceKm ?? Infinity) <= query.maxDistanceKm!);
    }
  }

  if (query.sort === 'distance' && hasUserLocation) {
    withDistance.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  } else if (query.sort === 'price-low') {
    withDistance.sort((a, b) => a.priceRange[0] - b.priceRange[0]);
  } else if (query.sort === 'price-high') {
    withDistance.sort((a, b) => b.priceRange[1] - a.priceRange[1]);
  }

  const total = withDistance.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const items = withDistance.slice(start, start + limit);

  return { items, pagination: { page, limit, total, totalPages } };
}

// View deduplication via TTL map (hashed IP + vendor, 30 min)
const viewTTL = new Map<string, number>();
const VIEW_TTL_MS = 30 * 60 * 1000;

export async function getVendorById(
  id: string,
  opts: { populateMenu?: boolean; requesterIp?: string; requesterId?: string; requesterRole?: string } = {},
): Promise<IVendor & { distanceKm?: number }> {
  let q = Vendor.findById(id);
  if (opts.populateMenu) {
    q = q.populate('menu') as typeof q;
  }
  const vendor = await q.exec();
  if (!vendor) {
    throw ApiError.notFound('Vendor not found');
  }

  const isOwner = vendor.owner && String(vendor.owner) === opts.requesterId;
  const isAdmin = opts.requesterRole === 'admin';
  // an inactive or not-yet-approved listing is only
  // visible to its own owner or an admin — everyone else gets the same
  // 404 as a genuinely missing vendor (no leak of "this exists but is
  // pending/deactivated" to the public).
  if ((!vendor.isActive || vendor.approvalStatus !== 'approved') && !isOwner && !isAdmin) {
    throw ApiError.notFound('Vendor not found');
  }

  // Skip view count for owners and admins; deduplicate by IP+vendor/30 min
  if (!isOwner && !isAdmin) {
    const key = `${opts.requesterIp ?? 'anon'}:${id}`;
    const last = viewTTL.get(key) ?? 0;
    const now = Date.now();
    if (now - last > VIEW_TTL_MS) {
      viewTTL.set(key, now);
      Vendor.updateOne({ _id: id }, { $inc: { views: 1 } }).catch(() => {});
    }
  }
  return vendor as IVendor & { distanceKm?: number };
}

export interface CreateVendorInput {
  name: string;
  cuisine: CuisineType;
  categories: FoodCategory[];
  description: string;
  longDescription?: string;
  image: string;
  logo?: string;
  priceRange?: [number, number];
  location: { address: string; area: string; city?: string; lat: number; lng: number };
  hours: { open: string; close: string; days?: string };
  phone: string;
  veg: VendorVegStatus;
  specialties?: string[];
}

export async function createVendor(
  input: CreateVendorInput,
  requester: { id: string; role: string },
): Promise<IVendor> {
  // Only block if existing vendor is ACTIVE
  if (requester.role === 'vendor') {
    const existingUser = await User.findById(requester.id).populate('vendor');
    if (existingUser?.vendor) {
      const linked = existingUser.vendor as unknown as IVendor;
      // If the linked vendor is active, block
      if (linked && linked.isActive !== false) {
        throw ApiError.conflict('This account already has a vendor listing');
      }
      // Otherwise clear the stale reference first
      await User.findByIdAndUpdate(requester.id, { $unset: { vendor: 1 } });
    }
  }

  // sanitize input — remove protected fields
  const safe = sanitizeVendorUpdate(input as unknown as Record<string, unknown>, requester.role);
  // every new listing starts pending, regardless of what the
  // client sends or who's creating it — even an admin creating a vendor
  // through this same endpoint goes through the same approval queue,
  // rather than silently self-approving.
  const vendor = await Vendor.create({ ...safe, owner: requester.id, approvalStatus: 'pending' });

  if (requester.role === 'vendor') {
    await User.findByIdAndUpdate(requester.id, { vendor: vendor._id });
  }

  return vendor;
}

// vendor approval gate — admin-only actions

export async function listPendingVendors(): Promise<IVendor[]> {
  return Vendor.find({ approvalStatus: 'pending' }).sort({ createdAt: 1 });
}

export async function approveVendor(vendorId: string): Promise<IVendor> {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw ApiError.notFound('Vendor not found');
  vendor.approvalStatus = 'approved';
  vendor.rejectionReason = undefined;
  await vendor.save();
  return vendor;
}

export async function rejectVendor(vendorId: string, reason?: string): Promise<IVendor> {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw ApiError.notFound('Vendor not found');
  vendor.approvalStatus = 'rejected';
  vendor.rejectionReason = reason?.trim() || 'No reason given';
  await vendor.save();
  return vendor;
}

async function assertCanModifyVendor(vendorId: string, requester: { id: string; role: string }): Promise<IVendor> {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    throw ApiError.notFound('Vendor not found');
  }
  const isOwner = vendor.owner && String(vendor.owner) === requester.id;
  if (requester.role !== 'admin' && !isOwner) {
    throw ApiError.forbidden('You do not have permission to modify this vendor');
  }
  // Non-admins cannot edit deactivated listings
  if (requester.role !== 'admin' && !vendor.isActive) {
    throw ApiError.forbidden('This listing is deactivated and cannot be edited');
  }
  return vendor;
}

export async function updateVendor(
  vendorId: string,
  rawUpdates: Record<string, unknown>,
  requester: { id: string; role: string },
): Promise<IVendor> {
  const vendor = await assertCanModifyVendor(vendorId, requester);
  // Strip protected fields
  const updates = sanitizeVendorUpdate(rawUpdates, requester.role);
  Object.assign(vendor, updates);
  await vendor.save();

  // Re-populate menu so the response always includes it
  await vendor.populate('menu');
  return vendor;
}

export async function deleteVendor(vendorId: string, requester: { id: string; role: string }): Promise<void> {
  const vendor = await assertCanModifyVendor(vendorId, requester);
  vendor.isActive = false;
  await vendor.save();

  // Unset user.vendor reference so the owner can register a new listing
  if (vendor.owner) {
    await User.updateOne(
      { _id: vendor.owner, vendor: vendor._id },
      { $unset: { vendor: 1 } },
    );
  }
}

// Popularity recomputation
export async function recomputeVendorPopularity(vendorId: string): Promise<void> {
  const { Favorite } = await import('../models/Favorite.model');
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) return;

  const favCount = await Favorite.countDocuments({ vendor: vendorId });

  // Weighted 0–100 formula:
  // rating (0–5 → 0–40), reviewCount (capped at 50 → 0–30),
  // favorites (capped at 30 → 0–20), views (capped at 500 → 0–10)
  const ratingScore = (vendor.rating / 5) * 40;
  const reviewScore = Math.min(vendor.reviewCount / 50, 1) * 30;
  const favScore = Math.min(favCount / 30, 1) * 20;
  const viewScore = Math.min(vendor.views / 500, 1) * 10;
  const popularity = Math.round(ratingScore + reviewScore + favScore + viewScore);

  await Vendor.updateOne({ _id: vendorId }, { popularity });
}

// Re-export sanitize for tests
export { OWNER_WRITABLE_FIELDS };
