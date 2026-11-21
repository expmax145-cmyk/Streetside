import { defineModel, type BaseDoc } from '../db/model';
import { FOOD_CATEGORIES, MENU_ITEM_VEG_STATUSES, type FoodCategory, type MenuItemVegStatus } from '../types/enums';

export interface IMenuItem extends BaseDoc {
  vendor: any;
  name: string;
  description: string;
  price: number;
  category: FoodCategory;
  veg: MenuItemVegStatus;
  image: string;
  popular: boolean;
  available: boolean;
}

// Normalized in the DB, but returned as `vendor.menu` on the wire (see Vendor).
export const MenuItem = defineModel<IMenuItem>({
  name: 'MenuItem',
  table: 'menu_items',
  fields: {
    vendor: { type: 'id', column: 'vendor_id', ref: 'Vendor', required: true },
    name: { type: 'string', required: true, trim: true, maxlength: 120 },
    description: { type: 'string', default: '', maxlength: 500 },
    price: { type: 'number', required: true, min: 0 },
    category: { type: 'string', enum: FOOD_CATEGORIES, required: true },
    veg: { type: 'string', enum: MENU_ITEM_VEG_STATUSES, required: true },
    image: { type: 'string', required: true },
    popular: { type: 'boolean', default: false },
    available: { type: 'boolean', default: true },
  },
});
