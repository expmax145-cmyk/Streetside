import { defineModel, type BaseDoc } from '../db/model';

export interface IReview extends BaseDoc {
  user: any;
  vendor: any;
  rating: number;
  comment: string;
}

// One review per (user, vendor): enforced by the reviews_user_vendor_key unique index.
export const Review = defineModel<IReview>({
  name: 'Review',
  table: 'reviews',
  fields: {
    user: { type: 'id', column: 'user_id', ref: 'User', required: true },
    vendor: { type: 'id', column: 'vendor_id', ref: 'Vendor', required: true },
    rating: { type: 'number', required: true, min: 1, max: 5 },
    comment: { type: 'string', required: true, trim: true, minlength: 1, maxlength: 1000 },
  },
});
