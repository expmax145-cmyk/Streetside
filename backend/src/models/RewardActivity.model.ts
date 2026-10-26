import { Schema, model, type Document, type Types } from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON';

export const REWARD_ACTIONS = ['registered', 'wrote_review', 'added_favorite'] as const;
export type RewardAction = (typeof REWARD_ACTIONS)[number];

export interface IRewardActivity extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  action: RewardAction;
  description: string;
  points: number;
  /** target vendor id for idempotency checking */
  target?: Types.ObjectId;
  createdAt: Date;
}

const rewardActivitySchema = new Schema<IRewardActivity>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, enum: REWARD_ACTIONS, required: true },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    points: { type: Number, required: true, min: 0 },
    // optional — only set for vendor-specific actions
    target: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Partial unique index — only one award per user+action+target
// when a target exists. 'registered' awards (no target) are not
// constrained by this index.
rewardActivitySchema.index(
  { user: 1, action: 1, target: 1 },
  {
    unique: true,
    partialFilterExpression: { target: { $exists: true } },
    name: 'unique_user_action_target',
  },
);

rewardActivitySchema.plugin(toJSONPlugin);

export const RewardActivity = model<IRewardActivity>('RewardActivity', rewardActivitySchema);
