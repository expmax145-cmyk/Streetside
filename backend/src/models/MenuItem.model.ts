import { Schema, model, type Document, type Types } from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON';
import { FOOD_CATEGORIES, MENU_ITEM_VEG_STATUSES, type FoodCategory, type MenuItemVegStatus } from '../types/enums';

export interface IMenuItem extends Document {
  _id: Types.ObjectId;
  vendor: Types.ObjectId;
  name: string;
  description: string;
  price: number;
  category: FoodCategory;
  veg: MenuItemVegStatus;
  image: string;
  popular: boolean;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 500 },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, enum: FOOD_CATEGORIES, required: true },
    veg: { type: String, enum: MENU_ITEM_VEG_STATUSES, required: true },
    image: { type: String, required: true },
    popular: { type: Boolean, default: false },
    available: { type: Boolean, default: true },
  },
  { timestamps: true },
);

menuItemSchema.index({ vendor: 1, category: 1 });

menuItemSchema.plugin(toJSONPlugin);

export const MenuItem = model<IMenuItem>('MenuItem', menuItemSchema);
