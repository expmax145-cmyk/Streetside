import { Favorite } from '../models/Favorite.model';
import { Vendor, type IVendor } from '../models/Vendor.model';
import { ApiError } from '../utils/ApiError';
import { awardPoints } from './reward.service';
import { recomputeVendorPopularity } from './vendor.service';

export async function listFavoriteVendors(userId: string): Promise<IVendor[]> {
  const favorites = await Favorite.find({ user: userId }).populate('vendor').sort({ createdAt: -1 });
  return favorites
    .filter((f) => f.vendor && (f.vendor as unknown as IVendor).isActive)
    .map((f) => f.vendor as unknown as IVendor);
}

export async function addFavorite(userId: string, vendorId: string): Promise<boolean> {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor || !vendor.isActive) {
    throw ApiError.notFound('Vendor not found');
  }

  try {
    await Favorite.create({ user: userId, vendor: vendorId });
  } catch (err) {
    if (isDuplicateKeyError(err)) return false; // already favorited
    throw err;
  }

  // awardPoints is idempotent — checked by RewardActivity partial index
  await awardPoints(userId, 'added_favorite', `Added ${vendor.name} to favorites`, vendorId).catch(() => undefined);
  // recompute popularity after a new favorite
  await recomputeVendorPopularity(vendorId).catch(() => {});
  return true;
}

export async function removeFavorite(userId: string, vendorId: string): Promise<void> {
  await Favorite.deleteOne({ user: userId, vendor: vendorId });
  // recompute popularity (fewer favorites now)
  await recomputeVendorPopularity(vendorId).catch(() => {});
  // No points reversal — reward was for the FIRST act of favoriting
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}
