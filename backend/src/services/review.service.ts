import { Types } from 'mongoose';
import { Review, type IReview } from '../models/Review.model';
import { Vendor } from '../models/Vendor.model';
import { ApiError } from '../utils/ApiError';
import { awardPoints } from './reward.service';
import { recomputeVendorPopularity } from './vendor.service';
import type { PaginatedResult } from './vendor.service';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// review avatar size limit — strip oversized base64 avatars
function stripOversizedAvatar(user: unknown): unknown {
  if (!user || typeof user !== 'object') return user;
  const u = user as Record<string, unknown>;
  if (typeof u.avatar === 'string' && u.avatar.startsWith('data:') && u.avatar.length > 20_000) {
    return { ...u, avatar: null };
  }
  return u;
}

export async function recomputeVendorRating(vendorId: string): Promise<void> {
  const [agg] = await Review.aggregate([
    { $match: { vendor: new Types.ObjectId(vendorId) } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const rating = agg ? Math.round(agg.avgRating * 10) / 10 : 0;
  const reviewCount = agg ? agg.count : 0;

  await Vendor.updateOne({ _id: vendorId }, { rating, reviewCount });
  // recompute popularity after rating change
  await recomputeVendorPopularity(vendorId).catch(() => {});
}

export async function listReviewsForVendor(
  vendorId: string,
  opts: { page?: number; limit?: number },
): Promise<PaginatedResult<IReview>> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, opts.limit ?? DEFAULT_LIMIT));

  const [items, total] = await Promise.all([
    Review.find({ vendor: vendorId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Review.countDocuments({ vendor: vendorId }),
  ]);

  // strip oversized base64 avatars from review list
  const safeItems = items.map((r) => {
    const obj = r.toJSON() as Record<string, unknown>;
    if (obj.user) obj.user = stripOversizedAvatar(obj.user);
    return obj;
  });

  return {
    items: safeItems as unknown as IReview[],
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function listReviewsByUser(userId: string): Promise<IReview[]> {
  return Review.find({ user: userId })
    .populate('vendor', 'name image')
    .sort({ createdAt: -1 });
}

export async function createReview(
  vendorId: string,
  userId: string,
  input: { rating: number; comment: string },
): Promise<IReview> {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor || !vendor.isActive) {
    throw ApiError.notFound('Vendor not found');
  }

  // prevent vendor owners from reviewing their own listing
  if (vendor.owner && String(vendor.owner) === userId) {
    throw ApiError.forbidden('You cannot review your own vendor listing');
  }

  const existing = await Review.findOne({ vendor: vendorId, user: userId });
  if (existing) {
    throw ApiError.conflict('You have already reviewed this vendor. Edit your existing review instead.');
  }

  const review = await Review.create({
    vendor: vendorId,
    user: userId,
    rating: input.rating,
    comment: input.comment,
  });

  await recomputeVendorRating(vendorId);
  // awardPoints is idempotent (checked by partial index in RewardActivity)
  await awardPoints(userId, 'wrote_review', `Wrote a review for ${vendor.name}`, vendorId).catch(() => undefined);
  return review.populate('user', 'name avatar');
}

async function assertCanModifyReview(reviewId: string, requester: { id: string; role: string }): Promise<IReview> {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw ApiError.notFound('Review not found');
  }
  const isAuthor = String(review.user) === requester.id;
  if (requester.role !== 'admin' && !isAuthor) {
    throw ApiError.forbidden('You can only modify your own review');
  }
  return review;
}

export async function updateReview(
  reviewId: string,
  requester: { id: string; role: string },
  input: { rating?: number; comment?: string },
): Promise<IReview> {
  const review = await assertCanModifyReview(reviewId, requester);
  if (input.rating !== undefined) review.rating = input.rating;
  if (input.comment !== undefined) review.comment = input.comment;
  await review.save();
  await recomputeVendorRating(String(review.vendor));
  return review.populate('user', 'name avatar');
}

export async function deleteReview(reviewId: string, requester: { id: string; role: string }): Promise<void> {
  const review = await assertCanModifyReview(reviewId, requester);
  const vendorId = String(review.vendor);
  await review.deleteOne();
  await recomputeVendorRating(vendorId);
  // Do NOT reverse points on delete — reward was for the act of writing
}
