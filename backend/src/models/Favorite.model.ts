import { defineModel, type BaseDoc } from '../db/model';

export interface IFavorite extends BaseDoc {
  user: any;
  vendor: any;
}

export const Favorite = defineModel<IFavorite>({
  name: 'Favorite',
  table: 'favorites',
  timestamps: { createdAt: true, updatedAt: false },
  fields: {
    user: { type: 'id', column: 'user_id', ref: 'User', required: true },
    vendor: { type: 'id', column: 'vendor_id', ref: 'Vendor', required: true },
  },
});
