import { Schema, model, type Document, type Types } from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON';

export interface IReview extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  vendor: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 },
  },
  { timestamps: true },
);

// Business rule: one review per user per vendor. A user editing their
// opinion should PUT/PATCH their existing review, not create a second
// one — this unique index makes that impossible to violate even if a
// controller bug tried to insert a duplicate.
reviewSchema.index({ user: 1, vendor: 1 }, { unique: true });

reviewSchema.plugin(toJSONPlugin);

export const Review = model<IReview>('Review', reviewSchema);
