export type CuisineType =
  | 'Biryani'
  | 'South Indian'
  | 'Street Food'
  | 'Chinese'
  | 'Fast Food'
  | 'Desserts'
  | 'Beverages'
  | 'North Indian'
  | 'Continental';

export type FoodCategory =
  | 'Biryani'
  | 'Dosa'
  | 'Momos'
  | 'Chaat'
  | 'Shawarma'
  | 'Burgers'
  | 'Desserts'
  | 'Tea & Coffee'
  | 'Chinese'
  | 'Andhra Meals';

export type VegStatus = 'veg' | 'non-veg' | 'egg';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  veg: VegStatus;
  image: string;
  popular: boolean;
  category: FoodCategory;
  available: boolean;
}

export interface Review {
  id: string;
  vendorId: string;
  author: string;
  avatar: string;
  rating: number;
  text: string;
  date: string;
}

export interface Vendor {
  id: string;
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
  // optional — undefined when the server has no user location to
  // compute distance from. UI must hide the distance label in that case
  // instead of showing a fake "0.0 km".
  distance?: number;
  location: {
    address: string;
    area: string;
    city: string;
    lat: number;
    lng: number;
  };
  hours: {
    open: string;
    close: string;
    days: string;
  };
  isOpen: boolean;
  phone: string;
  /** A second reach-out number (manager's mobile, delivery line, etc.), distinct from `phone`. */
  secondaryPhone?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
  /**
   * Vendor-controlled "temporarily closed" override, independent of
   * `hours` — e.g. out of stock or on leave for the day even though
   * still within normal opening hours. `isOpen` above already factors
   * this in (see vendorService.normalizeVendor); most UI should just
   * read `isOpen`/`isVendorOpenNow(hours)` and only needs this field
   * directly for the settings-form toggle itself.
   */
  manualClosed?: boolean;
  // owner-supplied license number; hygieneRating/hygieneVerified
  // are set only by an admin (StreetSide's own verification), never by
  // the vendor themselves.
  fssaiLicenseNumber?: string;
  hygieneRating?: number;
  hygieneVerified?: boolean;
  // a brand-new listing is 'pending' until an admin approves it.
  // Public endpoints never return a non-approved vendor to anyone but
  // its owner/an admin, so ordinary UI code can generally ignore this —
  // it only matters on the vendor's own dashboard and the admin panel.
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  veg: 'pure-veg' | 'non-veg' | 'both';
  menu: MenuItem[];
  specialties: string[];
  views: number;
  popularity: number;
}

export interface Category {
  id: string;
  name: FoodCategory;
  image: string;
  color: string;
  count: number;
}

export interface FoodTrail {
  id: string;
  name: string;
  description: string;
  image: string;
  stops: TrailStop[];
  duration: string;
  distance: string;
  difficulty: 'Easy' | 'Moderate' | 'Foodie';
  rating: number;
  reviewCount: number;
}

export interface TrailStop {
  order: number;
  vendorId: string;
  note: string;
}

export interface Offer {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  discount: string;
  code: string;
  expiry: string;
  conditions: string;
  color: string;
  isActive: boolean;
}

export interface EventItem {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  image: string;
  date: string;
  /** Raw ISO date string, kept alongside the locale-formatted `date` display
   *  string so edit forms (e.g. <input type="date">) have something they
   *  can actually parse without reformatting a locale string back to ISO.
   *  Optional so unrelated fixtures aren't forced to grow this field. */
  rawDate?: string;
  time: string;
  location: string;
  area: string;
  vendorIds: string[];
  featured: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  progress?: number;
}

export interface RewardActivity {
  id: string;
  action: string;
  points: number;
  date: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
  avatar: string;
  phone?: string;
  vendorId?: string;
  points: number;
  joinedDate: string;
  // never gates login/access — only used to show a
  // "verify your email" banner and the resend-verification action.
  emailVerified?: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
  status: 'active' | 'suspended';
  joinedDate: string;
  vendorId?: string;
}

export interface Report {
  id: string;
  type: 'review' | 'vendor' | 'user';
  targetId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  date: string;
  reporter: string;
}
