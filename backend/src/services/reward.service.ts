import { User } from '../models/User.model';
import { RewardActivity, type RewardAction } from '../models/RewardActivity.model';
import { Review } from '../models/Review.model';
import { Favorite } from '../models/Favorite.model';
import { Vendor } from '../models/Vendor.model';

export const POINTS: Record<RewardAction, number> = {
  registered: 100,
  wrote_review: 50,
  added_favorite: 20,
};

/**
 * Idempotent award — for actions tied to a specific vendor
 * (added_favorite, wrote_review), we only award once per user+action+target.
 * This prevents farming via unfavorite/refavorite or delete/re-review.
 * For 'registered' (no target), the uniqueness is enforced by the fact
 * that registration only happens once.
 */
export async function awardPoints(
  userId: string,
  action: RewardAction,
  description: string,
  targetVendorId?: string,
): Promise<void> {
  const points = POINTS[action];

  // Check if this award was already given for this user+action+target
  if (targetVendorId && (action === 'added_favorite' || action === 'wrote_review')) {
    const already = await RewardActivity.findOne({
      user: userId,
      action,
      target: targetVendorId,
    });
    if (already) return; // idempotent — already awarded
  }

  try {
    await Promise.all([
      RewardActivity.create({ user: userId, action, description, points, target: targetVendorId }),
      User.updateOne({ _id: userId }, { $inc: { points } }),
    ]);
  } catch (err: unknown) {
    // Duplicate key means the partial index caught a race — safe to ignore
    if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) return;
    throw err;
  }
}

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: number;
}

const BADGES: BadgeDefinition[] = [
  { id: 'rookie', name: 'Street Food Rookie', description: 'Favorited or reviewed your first vendor', icon: 'utensils', target: 1 },
  { id: 'explorer', name: 'Food Explorer', description: 'Favorited 5 different vendors', icon: 'compass', target: 5 },
  { id: 'legend', name: 'Local Legend', description: 'Favorited 10 different vendors', icon: 'crown', target: 10 },
  { id: 'review-pro', name: 'Review Pro', description: 'Wrote 5 reviews', icon: 'star', target: 5 },
  { id: 'biryani-hunter', name: 'Biryani Hunter', description: 'Reviewed 3 different biryani vendors', icon: 'flame', target: 3 },
];

export async function getMyRewards(userId: string) {
  const [user, activities, favoriteCount, reviewCount, biryaniVendorIds] = await Promise.all([
    User.findById(userId),
    RewardActivity.find({ user: userId }).sort({ createdAt: -1 }).limit(50),
    Favorite.countDocuments({ user: userId }),
    Review.countDocuments({ user: userId }),
    Review.find({ user: userId }).distinct('vendor'),
  ]);

  const biryaniReviewCount = biryaniVendorIds.length
    ? await Vendor.countDocuments({ _id: { $in: biryaniVendorIds }, cuisine: 'Biryani' })
    : 0;

  const progressByBadge: Record<string, number> = {
    rookie: Math.max(favoriteCount, reviewCount),
    explorer: favoriteCount,
    legend: favoriteCount,
    'review-pro': reviewCount,
    'biryani-hunter': biryaniReviewCount,
  };

  const badges = BADGES.map((badge) => {
    const progress = progressByBadge[badge.id] ?? 0;
    return {
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      earned: progress >= badge.target,
      progress: Math.min(100, Math.round((progress / badge.target) * 100)),
    };
  });

  // Expose point values so frontend can display server-authoritative amounts
  return {
    points: user?.points ?? 0,
    pointValues: POINTS,
    activities: activities.map((a) => ({
      id: String(a._id),
      action: a.description,
      points: a.points,
      date: a.createdAt,
    })),
    badges,
  };
}
