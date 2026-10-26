import { useEffect, useState } from 'react';
import { Award, Star, TrendingUp, Gift, Crown, Compass, Flame, Route, Utensils, Zap } from 'lucide-react';
import * as rewardService from '@/services/rewardService';
import { useAuth } from '@/contexts/AuthContext';
import type { Badge, RewardActivity } from '@/types';

const badgeIcons: Record<string, typeof Award> = {
  utensils: Utensils,
  compass: Compass,
  flame: Flame,
  crown: Crown,
  route: Route,
  star: Star,
};

const TIERS = [
  { name: 'Bronze', min: 0 },
  { name: 'Silver', min: 500 },
  { name: 'Gold', min: 1000 },
  { name: 'Platinum', min: 2000 },
];

function getTier(points: number) {
  let currentIdx = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (points >= TIERS[i].min) currentIdx = i;
  }
  return { current: TIERS[currentIdx], next: TIERS[currentIdx + 1] };
}

export function RewardsPage() {
  const { user } = useAuth();
  const points = user?.points ?? 0;
  const [badges, setBadges] = useState<Badge[]>([]);
  const [activities, setActivities] = useState<RewardActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    rewardService.getMyRewards()
      .then((data) => {
        if (cancelled) return;
        setBadges(data.badges);
        setActivities(data.activities);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const earnedBadges = badges.filter((b) => b.earned);
  const progressBadges = badges.filter((b) => !b.earned);
  const { current: currentTier, next: nextTier } = getTier(points);
  const tierProgress = nextTier
    ? Math.min(((points - currentTier.min) / (nextTier.min - currentTier.min)) * 100, 100)
    : 100;

  if (loading) {
    return (
      <div className="container-app py-20 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
        <p className="text-charcoal-500">Loading your rewards…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-app py-20 text-center">
        <h1 className="mb-2 text-2xl font-bold text-charcoal-900">Couldn't load your rewards</h1>
        <p className="text-charcoal-500">There was a problem reaching StreetSide's servers. Please try again shortly.</p>
      </div>
    );
  }

  return (
    <div className="container-app py-6 md:py-10">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Gift size={26} className="text-brand-600" /> Rewards</h1>
        <p className="page-subtitle">Earn points, unlock badges, and get rewarded for exploring food</p>
      </div>

      {/* Points card */}
      <div className="mb-6 relative overflow-hidden rounded-3xl bg-warm-gradient p-6 text-white shadow-warm-lg md:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative">
          <p className="mb-1 text-sm text-brand-50/90">Your points balance</p>
          <p className="mb-4 text-5xl font-extrabold">{points.toLocaleString()}</p>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5"><Crown size={15} className="text-gold-300" /> {currentTier.name} tier</span>
            <span className="text-brand-50/85">{nextTier ? `${nextTier.min - points} pts to ${nextTier.name}` : 'Highest tier reached'}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${tierProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Earned badges */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-charcoal-900"><Award size={20} className="text-brand-600" /> Earned badges ({earnedBadges.length})</h2>
        {earnedBadges.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-charcoal-200 py-10 text-center">
            <Award size={28} className="mx-auto mb-2 text-charcoal-300" />
            <p className="text-charcoal-500">No badges yet — check "In progress" below to see how to earn your first one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {earnedBadges.map((badge) => {
              const Icon = badgeIcons[badge.icon] || Award;
              return (
                <div key={badge.id} className="card flex flex-col items-center p-4 text-center">
                  <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-brand-500 text-white shadow-warm">
                    <Icon size={26} />
                  </div>
                  <h3 className="text-sm font-bold text-charcoal-900">{badge.name}</h3>
                  <p className="mt-0.5 text-xs text-charcoal-500">{badge.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* In progress badges */}
      {progressBadges.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-charcoal-900"><TrendingUp size={20} className="text-brand-600" /> In progress</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {progressBadges.map((badge) => {
              const Icon = badgeIcons[badge.icon] || Award;
              return (
                <div key={badge.id} className="card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-charcoal-100 text-charcoal-400">
                      <Icon size={22} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-charcoal-900">{badge.name}</h3>
                      <p className="text-xs text-charcoal-500">{badge.description}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-charcoal-400">
                      <span>Progress</span>
                      <span>{badge.progress ?? 0}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-charcoal-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${badge.progress ?? 0}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-charcoal-900"><Zap size={20} className="text-brand-600" /> Recent activity</h2>
        {activities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-charcoal-200 py-12 text-center">
            <p className="text-charcoal-500">No activity yet — favorite a vendor or write a review to start earning points.</p>
          </div>
        ) : (
          <div className="card divide-y divide-charcoal-100">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Star size={16} fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-charcoal-800">{activity.action}</p>
                    <p className="text-xs text-charcoal-400">{activity.date}</p>
                  </div>
                </div>
                <span className="badge bg-success-100 text-success-700">+{activity.points} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
