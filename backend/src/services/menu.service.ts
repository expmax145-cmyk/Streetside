import { MenuItem, type IMenuItem } from '../models/MenuItem.model';
import { Vendor } from '../models/Vendor.model';
import { ApiError } from '../utils/ApiError';
import type { FoodCategory, MenuItemVegStatus } from '../types/enums';

async function assertCanManageVendorMenu(vendorId: string, requester: { id: string; role: string }) {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor || !vendor.isActive) {
    throw ApiError.notFound('Vendor not found');
  }
  const isOwner = vendor.owner && String(vendor.owner) === requester.id;
  if (requester.role !== 'admin' && !isOwner) {
    throw ApiError.forbidden("You do not have permission to manage this vendor's menu");
  }
  return vendor;
}

export async function listMenuForVendor(vendorId: string): Promise<IMenuItem[]> {
  return MenuItem.find({ vendor: vendorId }).sort({ category: 1, name: 1 });
}

export interface MenuItemInput {
  name: string;
  description?: string;
  price: number;
  category: FoodCategory;
  veg: MenuItemVegStatus;
  image?: string;
  popular?: boolean;
  available?: boolean;
}

// Explicit menu item field allowlist
const MENU_WRITABLE_FIELDS = new Set([
  'name', 'description', 'price', 'category', 'veg',
  'image', 'popular', 'available',
]);

function sanitizeMenuInput(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (MENU_WRITABLE_FIELDS.has(k)) out[k] = v;
  }
  return out;
}

export async function addMenuItem(
  vendorId: string,
  requester: { id: string; role: string },
  input: MenuItemInput,
): Promise<IMenuItem> {
  await assertCanManageVendorMenu(vendorId, requester);
  const safe = sanitizeMenuInput(input as unknown as Record<string, unknown>);
  return MenuItem.create({ ...safe, vendor: vendorId });
}

async function findOwnedMenuItem(menuItemId: string, requester: { id: string; role: string }): Promise<IMenuItem> {
  const item = await MenuItem.findById(menuItemId);
  if (!item) {
    throw ApiError.notFound('Menu item not found');
  }
  await assertCanManageVendorMenu(String(item.vendor), requester);
  return item;
}

export async function updateMenuItem(
  menuItemId: string,
  requester: { id: string; role: string },
  rawUpdates: Record<string, unknown>,
): Promise<IMenuItem> {
  const item = await findOwnedMenuItem(menuItemId, requester);
  // Strip vendor, _id, timestamps
  const safe = sanitizeMenuInput(rawUpdates);
  Object.assign(item, safe);
  await item.save();
  return item;
}

export async function deleteMenuItem(menuItemId: string, requester: { id: string; role: string }): Promise<void> {
  const item = await findOwnedMenuItem(menuItemId, requester);
  await item.deleteOne();
}
