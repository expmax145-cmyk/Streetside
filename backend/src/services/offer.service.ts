import { Offer } from '../models/Offer.model';
import { Vendor } from '../models/Vendor.model';
import { ApiError } from '../utils/ApiError';
import { APP_TIMEZONE, endOfDayInTimezone } from '../utils/timezone';

async function assertCanManageVendor(vendorId: string, requester: { id: string; role: string }) {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor || !vendor.isActive) throw ApiError.notFound('Vendor not found');
  const isOwner = vendor.owner && String(vendor.owner) === requester.id;
  if (requester.role !== 'admin' && !isOwner)
    throw ApiError.forbidden('You do not have permission to manage this vendor');
  return vendor;
}

// Explicit offer field allowlist — vendor and _id are never accepted
const OFFER_WRITABLE_FIELDS: (keyof Record<string, unknown>)[] = [
  'title', 'description', 'discount', 'code', 'expiry',
  'conditions', 'color', 'isActive',
];

function sanitizeOfferInput(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of OFFER_WRITABLE_FIELDS) {
    if (key in raw) out[key as string] = raw[key as string];
  }
  // Normalize date-only expiry to end of day in APP_TIMEZONE
  if (out.expiry) {
    out.expiry = endOfDayInTimezone(new Date(out.expiry as string));
  }
  return out;
}

export async function listOffersForVendor(vendorId: string, opts: { includeInactive?: boolean } = {}) {
  const filter: Record<string, unknown> = { vendor: vendorId };
  if (!opts.includeInactive) {
    filter.isActive = true;
    filter.expiry = { $gt: new Date() };
  }
  return Offer.find(filter).sort({ expiry: 1 });
}

export async function listActiveOffers() {
  return Offer.find({ isActive: true, expiry: { $gt: new Date() } }).sort({ expiry: 1 });
}

export async function createOffer(
  vendorId: string,
  requester: { id: string; role: string },
  input: Record<string, unknown>,
) {
  await assertCanManageVendor(vendorId, requester);
  const safe = sanitizeOfferInput(input);
  try {
    return await Offer.create({ ...safe, vendor: vendorId });
  } catch (err: unknown) {
    if (isDuplicateKey(err)) {
      throw ApiError.conflict(
        'This vendor already has an active offer with that code. Use a different code.',
      );
    }
    throw err;
  }
}

export async function updateOffer(
  offerId: string,
  requester: { id: string; role: string },
  rawUpdates: Record<string, unknown>,
) {
  const offer = await Offer.findById(offerId);
  if (!offer) throw ApiError.notFound('Offer not found');
  await assertCanManageVendor(String(offer.vendor), requester);

  // Strip protected fields — vendor/id cannot be changed
  const safe = sanitizeOfferInput(rawUpdates);
  Object.assign(offer, safe);
  try {
    await offer.save();
  } catch (err: unknown) {
    if (isDuplicateKey(err)) {
      throw ApiError.conflict(
        'This vendor already has an active offer with that code. Use a different code.',
      );
    }
    throw err;
  }
  return offer;
}

export async function deleteOffer(offerId: string, requester: { id: string; role: string }) {
  const offer = await Offer.findById(offerId);
  if (!offer) throw ApiError.notFound('Offer not found');
  await assertCanManageVendor(String(offer.vendor), requester);
  // soft-delete clears the unique constraint via partial index
  offer.isActive = false;
  await offer.save();
}

function isDuplicateKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

export { APP_TIMEZONE };
