import api from './api';
import type { Badge, RewardActivity } from '@/types';

interface RewardsSummary {
  points: number;
  activities: RewardActivity[];
  badges: Badge[];
}

function normalizeRewards(value: Record<string, unknown>): RewardsSummary {
  const activities = Array.isArray(value.activities) ? value.activities : [];
  const badges = Array.isArray(value.badges) ? value.badges : [];
  return {
    points: Number(value.points ?? 0),
    activities: activities.map((a) => {
      const item = a as Record<string, unknown>;
      return {
        id: String(item.id),
        action: String(item.action ?? ''),
        points: Number(item.points ?? 0),
        date: item.date ? new Date(String(item.date)).toLocaleDateString() : '',
      };
    }),
    badges: badges.map((b) => {
      const item = b as Record<string, unknown>;
      return {
        id: String(item.id),
        name: String(item.name ?? ''),
        description: String(item.description ?? ''),
        icon: String(item.icon ?? ''),
        earned: Boolean(item.earned),
        progress: Number(item.progress ?? 0),
      };
    }),
  };
}

export async function getMyRewards(): Promise<RewardsSummary> {
  const res = await api.get('/rewards/me');
  return normalizeRewards(res.data as Record<string, unknown>);
}

export default { getMyRewards };
