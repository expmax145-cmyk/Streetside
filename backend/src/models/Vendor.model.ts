import { Schema, model, type Document, type Types } from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON';
import {
  CUISINE_TYPES,
  FOOD_CATEGORIES,
  VENDOR_VEG_STATUSES,
  type CuisineType,
  type FoodCategory,
  type VendorVegStatus,
} from '../types/enums';

export interface IVendor extends Document {
  _id: Types.ObjectId;
  owner?: Types.ObjectId;
  name: string;
  cuisine: CuisineType;
  categories: FoodCategory[];
  description: string;
  longDescription: string;
  image: string;
  logo: string;
  rating: number;
  reviewCount: number;
  priceRange: [number, number];
  location: {
    address: string;
    area: string;
    city: string;
    lat: number;
    lng: number;
    // GeoJSON mirror of lat/lng, kept in sync in a pre-save hook below.
    // Powers $near / $geoWithin queries for "near me" style filtering —
    // plain lat/lng fields can't be indexed for that the same way.
    point: { type: 'Point'; coordinates: [number, number] };
  };
  hours: { open: string; close: string; days: string };
  phone: string;
  // A second reach-out number (e.g. a manager's mobile, a delivery line)
  // distinct from the primary listed `phone`. Optional — most vendors
  // only have one number.
  secondaryPhone?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
  // Manual "temporarily closed" override the vendor can flip themselves —
  // independent of `hours`, since a vendor can be within their normal
  // opening hours but out of stock, on leave, etc. for the day.
  // `isVendorOpenNow(hours)` (frontend/src/lib/format.ts and this
  // backend's utils/vendorHours.ts) still computes the hours-based
  // open/closed state; this only ever forces it to "closed", never to
  // "open" outside real hours.
  manualClosed: boolean;
  veg: VendorVegStatus;
  specialties: string[];
  views: number;
  popularity: number;
  isActive: boolean;
  // (vendor approval gate, deferred item from the original fix
  // pass): a brand-new vendor listing is not publicly visible until an
  // admin approves it. `isActive` is a separate, later-stage toggle
  // (an already-approved listing an admin subsequently deactivates) —
  // the two states are independent so "deactivate" and "reject" stay
  // distinguishable in the admin UI and in vendor.service's queries.
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  // (FSSAI/hygiene display, deferred item from the original fix
  // pass): owner-supplied license number; hygieneRating/hygieneVerified
  // are admin-only fields (see vendor.service.sanitizeVendorUpdate) since
  // they represent StreetSide's own verification, not a self-report.
  fssaiLicenseNumber?: string;
  hygieneRating?: number;
  hygieneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vendorSchema = new Schema<IVendor>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    cuisine: { type: String, enum: CUISINE_TYPES, required: true },
    categories: [{ type: String, enum: FOOD_CATEGORIES }],
    description: { type: String, required: true, maxlength: 300 },
    longDescription: { type: String, default: '', maxlength: 2000 },
    image: { type: String, required: true },
    logo: { type: String, default: '' },
    // Denormalized aggregates, kept in sync by the Review service (see
    // services/review.service.ts, Phase 5) whenever a review is created,
    // updated, or deleted for this vendor. Stored (rather than computed
    // on every request) so the frontend's existing vendor.rating /
    // vendor.reviewCount fields keep working unchanged, and so sorting
    // vendor lists by rating doesn't require an aggregation on every
    // GET /api/vendors call.
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    priceRange: {
      type: [Number],
      validate: {
        validator: (v: number[]) => v.length === 2 && v[0] >= 0 && v[1] >= v[0],
        message: 'priceRange must be [min, max] with min >= 0 and max >= min',
      },
      default: [50, 200],
    },
    location: {
      address: { type: String, required: true },
      area: { type: String, required: true },
      city: { type: String, required: true, default: 'Vijayawada' },
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
      point: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },
    hours: {
      open: { type: String, required: true },
      close: { type: String, required: true },
      days: { type: String, required: true, default: 'Mon - Sun' },
    },
    phone: { type: String, required: true, trim: true },
    secondaryPhone: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    socialLinks: {
      instagram: { type: String, trim: true, default: '' },
      facebook: { type: String, trim: true, default: '' },
      whatsapp: { type: String, trim: true, default: '' },
    },
    manualClosed: { type: Boolean, default: false },
    veg: { type: String, enum: VENDOR_VEG_STATUSES, required: true },
    specialties: [{ type: String }],
    views: { type: Number, default: 0, min: 0 },
    popularity: { type: Number, default: 0, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    // pending by default -- see vendor.service.createVendor,
    // which forces this regardless of what the client sends.
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, trim: true, maxlength: 300 },
    // fssaiLicenseNumber: { type: String, trim: true, maxlength: 30 },
    hygieneRating: { type: Number, min: 1, max: 5 },
    hygieneVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Keep the GeoJSON point in sync with lat/lng whenever either changes.
vendorSchema.pre('save', function syncGeoPoint(next) {
  if (this.isModified('location.lat') || this.isModified('location.lng') || this.isNew) {
    this.location.point = {
      type: 'Point',
      coordinates: [this.location.lng, this.location.lat],
    };
  }
  next();
});

vendorSchema.index({ 'location.point': '2dsphere' });
vendorSchema.index({ categories: 1 });
vendorSchema.index({ veg: 1 });
vendorSchema.index({ isActive: 1 });
vendorSchema.index({ approvalStatus: 1 });
vendorSchema.index({ rating: -1 });
vendorSchema.index({ name: 'text', description: 'text', specialties: 'text', cuisine: 'text' });

// Virtual populate: lets controllers call
// Vendor.findById(id).populate('menu') to get this vendor's menu items
// without embedding them in the document. This keeps the API response
// shape matching the frontend's existing `vendor.menu` field, even
// though menu items are actually a separate collection (see
// MenuItem.model.ts) — normalized in the DB, denormalized on the wire.
vendorSchema.virtual('menu', {
  ref: 'MenuItem',
  localField: '_id',
  foreignField: 'vendor',
});

vendorSchema.plugin(toJSONPlugin);

export const Vendor = model<IVendor>('Vendor', vendorSchema);
