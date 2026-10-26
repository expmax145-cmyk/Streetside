import { Schema, model, type Document, type Types } from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON';

export interface IFavorite extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  vendor: Types.ObjectId;
  createdAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// A user can only favorite a given vendor once. POST /api/favorites/:vendorId
// relies on this being idempotent-safe (a duplicate insert throws a
// duplicate-key error, which the controller treats as "already favorited"
// rather than a real error).
favoriteSchema.index({ user: 1, vendor: 1 }, { unique: true });

favoriteSchema.plugin(toJSONPlugin);

export const Favorite = model<IFavorite>('Favorite', favoriteSchema);
