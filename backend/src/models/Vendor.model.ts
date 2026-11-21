import { defineModel, type BaseDoc } from '../db/model';
import {
  CUISINE_TYPES,
  FOOD_CATEGORIES,
  VENDOR_VEG_STATUSES,
  type CuisineType,
  type FoodCategory,
  type VendorVegStatus,
} from '../types/enums';

export interface IVendor extends BaseDoc {
  owner?: any;
  name: string;
  cuisine: CuisineType;
  categories: FoodCategory[];
  description: string;
  longDescription: string;
  image: string;
  logo: string;
  // Denormalized aggregates kept in sync by services/review.service.ts.
  rating: number;
  reviewCount: number;
  priceRange: [number, number];
  location: {
    address: string;
    area: string;
    city: string;
    lat: number;
    lng: number;
    /** GeoJSON mirror of lat/lng, computed on output. */
    point?: { type: 'Point'; coordinates: [number, number] };
  };
  hours: { open: string; close: string; days: string };
  phone: string;
  secondaryPhone?: string;
  website?: string;
  socialLinks?: { instagram?: string; facebook?: string; whatsapp?: string };
  /** Manual "temporarily closed" override; only ever forces closed. */
  manualClosed: boolean;
  veg: VendorVegStatus;
  specialties: string[];
  views: number;
  popularity: number;
  isActive: boolean;
  /** New listings stay hidden until an admin approves them. */
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  fssaiLicenseNumber?: string;
  /** Admin-only fields (see vendor.service.sanitizeVendorUpdate). */
  hygieneRating?: number;
  hygieneVerified: boolean;
  menu?: any[];
}

export const Vendor = defineModel<IVendor>({
  name: 'Vendor',
  table: 'vendors',
  fields: {
    owner: { type: 'id', column: 'owner_id', ref: 'User' },
    name: { type: 'string', required: true, trim: true, maxlength: 120 },
    cuisine: { type: 'string', enum: CUISINE_TYPES, required: true },
    categories: { type: 'strings', elementEnum: FOOD_CATEGORIES },
    description: { type: 'string', required: true, maxlength: 300 },
    longDescription: { type: 'string', default: '', maxlength: 2000 },
    image: { type: 'string', required: true },
    logo: { type: 'string', default: '' },
    rating: { type: 'number', default: 0, min: 0, max: 5 },
    reviewCount: { type: 'number', default: 0, min: 0 },
    priceRange: {
      type: 'numbers',
      default: [50, 200],
      validate: (v: number[]) =>
        v.length === 2 && v[0] >= 0 && v[1] >= v[0]
          ? null
          : 'priceRange must be [min, max] with min >= 0 and max >= min',
    },
    'location.address': { type: 'string', required: true },
    'location.area': { type: 'string', required: true },
    'location.city': { type: 'string', required: true, default: 'Vijayawada' },
    'location.lat': { type: 'number', required: true, min: -90, max: 90 },
    'location.lng': { type: 'number', required: true, min: -180, max: 180 },
    'hours.open': { type: 'string', required: true },
    'hours.close': { type: 'string', required: true },
    'hours.days': { type: 'string', required: true, default: 'Mon - Sun' },
    phone: { type: 'string', required: true, trim: true },
    secondaryPhone: { type: 'string', trim: true, default: '' },
    website: { type: 'string', trim: true, default: '' },
    'socialLinks.instagram': { type: 'string', column: 'social_instagram', trim: true, default: '' },
    'socialLinks.facebook': { type: 'string', column: 'social_facebook', trim: true, default: '' },
    'socialLinks.whatsapp': { type: 'string', column: 'social_whatsapp', trim: true, default: '' },
    manualClosed: { type: 'boolean', default: false },
    veg: { type: 'string', enum: VENDOR_VEG_STATUSES, required: true },
    specialties: { type: 'strings' },
    views: { type: 'number', default: 0, min: 0 },
    popularity: { type: 'number', default: 0, min: 0, max: 100 },
    isActive: { type: 'boolean', default: true },
    approvalStatus: { type: 'string', enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: 'string', trim: true, maxlength: 300 },
    fssaiLicenseNumber: { type: 'string', trim: true, maxlength: 30 },
    hygieneRating: { type: 'number', min: 1, max: 5 },
    hygieneVerified: { type: 'boolean', default: false },
  },
  // `vendor.menu` is a separate table, loaded with .populate('menu').
  textSearch: ['name', 'description', 'specialties', 'cuisine'],
  virtuals: { menu: { ref: 'MenuItem', foreignField: 'vendor' } },
  toJSONExtra(json, doc) {
    const loc = doc.location;
    if (loc && loc.lat !== undefined && loc.lng !== undefined) {
      json.location = { ...json.location, point: { type: 'Point', coordinates: [loc.lng, loc.lat] } };
    }
  },
});
