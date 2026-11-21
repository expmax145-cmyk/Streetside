import { defineModel, type BaseDoc } from '../db/model';

export const REWARD_ACTIONS = ['registered', 'wrote_review', 'added_favorite'] as const;
export type RewardAction = (typeof REWARD_ACTIONS)[number];

export interface IRewardActivity extends BaseDoc {
  user: any;
  action: RewardAction;
  description: string;
  points: number;
  /** target vendor id for idempotency checking */
  target?: any;
}

// Each (user, action, vendor) can earn points once: partial unique index
// unique_user_action_target applies whenever a target is set.
export const RewardActivity = defineModel<IRewardActivity>({
  name: 'RewardActivity',
  table: 'reward_activities',
  timestamps: { createdAt: true, updatedAt: false },
  fields: {
    user: { type: 'id', column: 'user_id', ref: 'User', required: true },
    action: { type: 'string', enum: REWARD_ACTIONS, required: true },
    description: { type: 'string', required: true, trim: true, maxlength: 200 },
    points: { type: 'number', required: true, min: 0 },
    target: { type: 'id', column: 'target_id', ref: 'Vendor' },
  },
});
