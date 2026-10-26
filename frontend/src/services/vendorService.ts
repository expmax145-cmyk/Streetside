import api from './api';
import type { Vendor } from '@/types';
import { vendorIsOpenNow } from '@/lib/format';

type VendorPayload = Record<string, unknown>;

/**
 * Normalizes a raw vendor object from the API into the frontend's `Vendor`
 * shape, filling in safe defaults for every optional/nullable field.
 *
 * This exists so that:
 *  1. Backend documents (which use Mongo `_id`) and any locally-created
 *     objects (which use `id`) both resolve to a single `id: string`.
 *  2. A vendor that's missing a field the UI expects (menu, image, hours,
 *     etc. — e.g. a brand new vendor with nothing filled in yet) never
 *     reaches a component as `undefined`, which is what causes render
 *     crashes ("cannot read property of undefined") deep in vendor
 *     cards/profile pages. Every field gets a typed, render-safe default
 *     instead.
 */
function normalizeVendor(value: VendorPayload): Vendor {
  const location = (value.location && typeof value.location === 'object' ? value.location : {}) as Record<string, unknown>;
  const hours = (value.hours && typeof value.hours === 'object' ? value.hours : {}) as Record<string, unknown>;
  const priceRange = Array.isArray(value.priceRange) && value.priceRange.length === 2
    ? (value.priceRange as [number, number])
    : ([50, 200] as [number, number]);

  return {
    id: String(value.id ?? value._id ?? ''),
    name: String(value.name ?? 'Unnamed vendor'),
    cuisine: (value.cuisine as Vendor['cuisine']) ?? 'Street Food',
    categories: Array.isArray(value.categories) ? (value.categories as Vendor['categories']) : [],
    description: String(value.description ?? ''),
    longDescription: String(value.longDescription ?? ''),
    image: String(value.image ?? ''),
    logo: String(value.logo ?? ''),
    rating: Number(value.rating ?? 0),
    reviewCount: Number(value.reviewCount ?? 0),
    priceRange,
    // undefined (not 0) when the server didn't compute a
    // distance -- 0 used to render as a fake "0.0 km" on every card.
    distance: (value.distanceKm !== undefined || value.distance !== undefined)
      ? Number(value.distanceKm ?? value.distance)
      : undefined,
    location: {
      address: String(location.address ?? ''),
      area: String(location.area ?? ''),
      city: String(location.city ?? ''),
      lat: Number(location.lat ?? 0),
      lng: Number(location.lng ?? 0),
    },
    hours: {
      open: String(hours.open ?? ''),
      close: String(hours.close ?? ''),
      days: String(hours.days ?? 'Mon - Sun'),
    },
    isOpen: typeof value.isOpen === 'boolean'
      ? value.isOpen
      : vendorIsOpenNow({
          hours: { open: String(hours.open ?? ''), close: String(hours.close ?? ''), days: String(hours.days ?? 'Mon - Sun') },
          manualClosed: value.manualClosed === true,
        }),
    phone: String(value.phone ?? ''),
    secondaryPhone: value.secondaryPhone ? String(value.secondaryPhone) : undefined,
    website: value.website ? String(value.website) : undefined,
    socialLinks: (value.socialLinks && typeof value.socialLinks === 'object')
      ? (() => {
          const sl = value.socialLinks as Record<string, unknown>;
          const out: NonNullable<Vendor['socialLinks']> = {};
          if (sl.instagram) out.instagram = String(sl.instagram);
          if (sl.facebook) out.facebook = String(sl.facebook);
          if (sl.whatsapp) out.whatsapp = String(sl.whatsapp);
          return out;
        })()
      : undefined,
    manualClosed: value.manualClosed === true,
    veg: (value.veg as Vendor['veg']) ?? 'both',
    menu: Array.isArray(value.menu) ? (value.menu as Vendor['menu']) : [],
    specialties: Array.isArray(value.specialties) ? (value.specialties as string[]) : [],
    views: Number(value.views ?? 0),
    popularity: Number(value.popularity ?? 0),
    // FSSAI/hygiene — all optional, simply omitted when the
    // backend doesn't send them (an unlicensed/unverified vendor).
    fssaiLicenseNumber: value.fssaiLicenseNumber ? String(value.fssaiLicenseNumber) : undefined,
    hygieneRating: typeof value.hygieneRating === 'number' ? value.hygieneRating : undefined,
    hygieneVerified: value.hygieneVerified === true,
    // approval gate — present on every vendor from the backend,
    // but optional here since older cached/local objects may not have it.
    approvalStatus: (value.approvalStatus as Vendor['approvalStatus']) ?? undefined,
    rejectionReason: value.rejectionReason ? String(value.rejectionReason) : undefined,
  };
}

// Admin views need `isActive` too, which the public-facing
// `Vendor` type doesn't carry (public listings never include inactive
// vendors in the first place, so it was never needed there).
export interface AdminVendor extends Vendor {
  isActive: boolean;
}

export function normalizeVendorForAdmin(value: VendorPayload): AdminVendor {
  return { ...normalizeVendor(value), isActive: value.isActive !== false };
}

export interface VendorPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface VendorListResult {
  vendors: Vendor[];
  pagination: VendorPagination | null;
}

export async function listVendors(query = ''): Promise<VendorListResult> {
  // The API sends `{ success, data, pagination }` — pagination is a
  // top-level sibling of `data`, not nested inside it (see
  // backend/src/utils/apiResponse.ts).
  const res = await api.get(`/vendors${query ? '?' + query : ''}`);
  const data = res.data;
  const items = Array.isArray(data) ? data : (data as { items?: unknown[] })?.items;
  const vendors = Array.isArray(items) ? items.map((vendor) => normalizeVendor(vendor as VendorPayload)) : [];
  return { vendors, pagination: (res.pagination as VendorPagination | undefined) ?? null };
}

export async function getVendor(id: string): Promise<Vendor> {
  const res = await api.get(`/vendors/${id}`);
  return normalizeVendor(res.data as VendorPayload);
}

export async function createVendor(payload: VendorPayload): Promise<Vendor> {
  const res = await api.post('/vendors', payload);
  return normalizeVendor(res.data as VendorPayload);
}

export async function updateVendor(id: string, updates: VendorPayload): Promise<Vendor> {
  const res = await api.put(`/vendors/${id}`, updates);
  return normalizeVendor(res.data as VendorPayload);
}

export async function deleteVendor(id: string) {
  const res = await api.del(`/vendors/${id}`);
  return res.data;
}

export default { listVendors, getVendor, createVendor, updateVendor, deleteVendor };
