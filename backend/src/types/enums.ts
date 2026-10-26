/**
 * These mirror frontend/src/types/index.ts exactly (CuisineType,
 * FoodCategory, VegStatus). The two codebases can't literally share a
 * TypeScript file across the Vite/Node boundary without a monorepo
 * package setup, so this list is kept in sync by hand — if you add a
 * cuisine or category on the frontend, add it here too, or the backend
 * will reject it as invalid.
 */

export const CUISINE_TYPES = [
  'Biryani',
  'South Indian',
  'Street Food',
  'Chinese',
  'Fast Food',
  'Desserts',
  'Beverages',
  'North Indian',
  'Continental',
] as const;
export type CuisineType = (typeof CUISINE_TYPES)[number];

export const FOOD_CATEGORIES = [
  'Biryani',
  'Dosa',
  'Momos',
  'Chaat',
  'Shawarma',
  'Burgers',
  'Desserts',
  'Tea & Coffee',
  'Chinese',
  'Andhra Meals',
] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const MENU_ITEM_VEG_STATUSES = ['veg', 'non-veg', 'egg'] as const;
export type MenuItemVegStatus = (typeof MENU_ITEM_VEG_STATUSES)[number];

export const VENDOR_VEG_STATUSES = ['pure-veg', 'non-veg', 'both'] as const;
export type VendorVegStatus = (typeof VENDOR_VEG_STATUSES)[number];

export const USER_ROLES = ['customer', 'vendor', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['active', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const TRAIL_DIFFICULTIES = ['Easy', 'Moderate', 'Foodie'] as const;
export type TrailDifficulty = (typeof TRAIL_DIFFICULTIES)[number];

export const REPORT_TYPES = ['review', 'vendor', 'user'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_STATUSES = ['pending', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
