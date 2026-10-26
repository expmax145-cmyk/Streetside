import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { env } from '../config/env';
import { hashPassword, User } from '../models/User.model';
import { Vendor } from '../models/Vendor.model';
import { MenuItem } from '../models/MenuItem.model';
import { Review } from '../models/Review.model';
import { Favorite } from '../models/Favorite.model';
import { Offer } from '../models/Offer.model';
import { Event } from '../models/Event.model';
import { FoodTrail } from '../models/FoodTrail.model';
import { Report } from '../models/Report.model';
import { recomputeVendorRating } from '../services/review.service';
import { awardPoints } from '../services/reward.service';
import type { CuisineType, FoodCategory, VendorVegStatus, MenuItemVegStatus } from '../types/enums';

/**
 * This seed script is a direct, structured port of the rich hand-curated
 * dataset that used to live ONLY in the frontend as static fixtures
 * (frontend/src/data/vendors.ts and content.ts). It is now real data: every
 * vendor, menu item, review, offer, event and food trail below becomes an
 * actual MongoDB document, reachable through the real API — not a hardcoded
 * fixture the frontend imports directly.
 *
 * Two consequences of that worth knowing before you run this:
 *
 * 1. Ratings/review counts are NEVER hardcoded here. They're computed from
 *    the Review documents this script creates, via the exact same
 *    recomputeVendorRating() the live review API uses. That's why the
 *    numbers you'll see are smaller than the old frontend fixture's invented
 *    ones (e.g. "1.3k reviews") — those were display copy, not real records.
 *    What you get after seeding is 100% real, consistent, and will keep
 *    incrementing correctly as real users leave real reviews.
 *
 * 2. Offer/event dates are computed relative to "now" at seed time (not the
 *    original hardcoded 2026 calendar dates), so a freshly seeded database
 *    always has live, non-expired offers and upcoming events — regardless of
 *    when you actually run this script.
 */

const DAY = 1000 * 60 * 60 * 24;
const now = () => Date.now();

// ---------------------------------------------------------------------------
// Vendors — ported from frontend/src/data/vendors.ts `vendors` array.
// ---------------------------------------------------------------------------

interface VendorSeed {
  key: string;
  name: string;
  cuisine: CuisineType;
  categories: FoodCategory[];
  description: string;
  longDescription: string;
  image: string;
  logo: string;
  priceRange: [number, number];
  location: { address: string; area: string; city: string; lat: number; lng: number };
  hours: { open: string; close: string; days: string };
  phone: string;
  veg: VendorVegStatus;
  specialties: string[];
  views: number;
  popularity: number;
}

const VENDORS: VendorSeed[] = [
  {
    key: 'vendor-1', name: 'Vijayawada Spice Hub', cuisine: 'Biryani', categories: ['Biryani', 'Desserts'],
    description: 'Legendary biryani spot serving authentic Andhra-style dum biryani since 1998.',
    longDescription: 'Vijayawada Spice Hub has been a cornerstone of the local food scene for over two decades. Known for its slow-cooked dum biryani, the kitchen uses a secret blend of 27 spices sourced from across Andhra Pradesh. The chicken is marinated overnight and cooked in sealed handis to lock in every drop of flavor. Beyond biryani, the menu features classic Andhra sides like Chicken 65 and traditional Hyderabadi desserts. A must-visit for any serious food lover in the city.',
    image: '/menu-images/01-chicken-dum-biryani.jpg', logo: '/menu-images/01-chicken-dum-biryani.jpg',
    priceRange: [90, 320],
    location: { address: 'MG Road, Beside Bharat Petroleum', area: 'Governorpet', city: 'Vijayawada', lat: 16.5062, lng: 80.648 },
    hours: { open: '11:00', close: '23:00', days: 'Mon - Sun' }, phone: '+91 98660 11223', veg: 'both',
    specialties: ['Chicken Dum Biryani', 'Mutton Biryani', 'Chicken 65'], views: 15420, popularity: 98,
  },
  {
    key: 'vendor-2', name: 'Mangalagiri Dosa Corner', cuisine: 'South Indian', categories: ['Dosa', 'Tea & Coffee'],
    description: 'Crispy dosas and fluffy idlis made fresh on a cast iron tawa every morning.',
    longDescription: 'A humble roadside stall that has grown into a local institution. Mangalagiri Dosa Corner serves over 200 dosas a day, each one crispy on the outside and soft on the inside. The batter is fermented naturally for 12 hours, giving the dosas their signature tangy flavor. The coconut chutney and sambar are made fresh every few hours. Don\'t miss their Punugulu — a local Andhra specialty that sells out by 10 AM.',
    image: '/vendor-images/01-vijay-food-co.jpg', logo: '/vendor-images/01-vijay-food-co.jpg',
    priceRange: [25, 120],
    location: { address: 'NH16, Near Mangalagiri Bus Stop', area: 'Mangalagiri', city: 'Guntur', lat: 16.4372, lng: 80.5534 },
    hours: { open: '06:00', close: '12:00', days: 'Mon - Sun' }, phone: '+91 98765 43210', veg: 'pure-veg',
    specialties: ['Masala Dosa', 'Paneer Dosa', 'Punugulu'], views: 9830, popularity: 92,
  },
  {
    key: 'vendor-3', name: 'Guntur Street Bites', cuisine: 'Street Food', categories: ['Chaat'],
    description: 'The go-to spot for fiery Guntur-style chaat, mirchi bajji, and pani puri.',
    longDescription: 'Guntur Street Bites brings the bold, spicy flavors of Guntur to the streets. Famous for their Mirchi Bajji — large green chilies stuffed with spiced potato, dipped in gram flour batter, and fried to golden perfection. Their pani puri water is legendary, with a secret mix of tamarind, mint, and green chili that keeps locals coming back daily. A true street food experience.',
    image: '/vendor-images/03-guntur-street-bites.jpg', logo: '/vendor-images/03-guntur-street-bites.jpg',
    priceRange: [20, 60],
    location: { address: 'Lakshmi Talkies Road', area: 'Arundelpet', city: 'Guntur', lat: 16.3067, lng: 80.4365 },
    hours: { open: '16:00', close: '22:30', days: 'Mon - Sat' }, phone: '+91 90000 12345', veg: 'pure-veg',
    specialties: ['Mirchi Bajji', 'Pani Puri', 'Dahi Puri'], views: 7210, popularity: 88,
  },
  {
    key: 'vendor-4', name: 'Himalayan Momos', cuisine: 'Street Food', categories: ['Momos'],
    description: 'Authentic steamed and fried momos with a fiery homemade red chutney.',
    longDescription: 'Started by a migrant family from Darjeeling, Himalayan Momos brings the taste of the northeast to South India. Every dumpling is hand-folded with a thin wrapper and generous filling. The red chutney — made with roasted tomatoes, dried red chilies, and garlic — is what sets them apart. The steamed momos are soft and juicy, while the fried version adds a satisfying crunch. A crowd favorite for evening snacks.',
    image: '/vendor-images/04-himalayan-momos.jpg', logo: '/vendor-images/04-himalayan-momos.jpg',
    priceRange: [60, 100],
    location: { address: 'Beside PVP Mall, MG Road', area: 'Labbipet', city: 'Vijayawada', lat: 16.5108, lng: 80.6512 },
    hours: { open: '15:00', close: '22:00', days: 'Mon - Sun' }, phone: '+91 91234 56789', veg: 'both',
    specialties: ['Steamed Momos', 'Fried Momos', 'Thukpa Soup'], views: 6540, popularity: 85,
  },
  {
    key: 'vendor-5', name: 'Shawarma Junction', cuisine: 'Fast Food', categories: ['Shawarma'],
    description: 'Lebanese-style shawarma wraps with garlic sauce and fresh veggies.',
    longDescription: 'Shawarma Junction introduced authentic Lebanese-style shawarma to the city. The chicken is marinated for 24 hours in yogurt, garlic, and Middle Eastern spices, then stacked on a vertical rotisserie and slow-roasted. Each wrap is made to order with warm pita, garlic toum sauce, pickles, and fresh vegetables. The paneer and falafel options make it a hit with vegetarians too.',
    image: '/vendor-images/05-shawarma-junction.jpg', logo: '/vendor-images/05-shawarma-junction.jpg',
    priceRange: [80, 120],
    location: { address: 'Eluru Road, Opp. Ranga Gudi', area: 'One Town', city: 'Vijayawada', lat: 16.5208, lng: 80.6493 },
    hours: { open: '12:00', close: '01:00', days: 'Mon - Sun' }, phone: '+91 94400 11223', veg: 'both',
    specialties: ['Chicken Shawarma', 'Paneer Shawarma', 'Falafel Wrap'], views: 8920, popularity: 90,
  },
  {
    key: 'vendor-6', name: 'Burger Barn', cuisine: 'Fast Food', categories: ['Burgers', 'Desserts'],
    description: 'Juicy burgers, loaded fries, and thick shakes in a funky street-side setup.',
    longDescription: 'Burger Barn is a street food stall with a big personality. Their burgers use fresh, never-frozen patties grilled to order on a flat-top. The house sauce — a smoky, slightly sweet mayo — is what keeps regulars hooked. Loaded fries come with cheese sauce and jalapeños, and the milkshakes are thick enough to need a spoon. A great spot for a quick, satisfying meal.',
    image: '/vendor-images/06-burger-barn.jpg', logo: '/vendor-images/06-burger-barn.jpg',
    priceRange: [70, 140],
    location: { address: 'Bandar Road, Near PVR Cinemas', area: 'Suryaraopet', city: 'Vijayawada', lat: 16.5175, lng: 80.6213 },
    hours: { open: '11:00', close: '23:30', days: 'Mon - Sun' }, phone: '+91 96666 33445', veg: 'both',
    specialties: ['Chicken Cheese Burger', 'Loaded Fries', 'Classic Veg Burger'], views: 5430, popularity: 80,
  },
  {
    key: 'vendor-7', name: 'Wok & Roll', cuisine: 'Chinese', categories: ['Chinese'],
    description: 'Indo-Chinese street food with smoky wok flavors and bold sauces.',
    longDescription: 'Wok & Roll specializes in Indo-Chinese street food — the fusion cuisine that India has made its own. The high-heat wok cooking gives every dish a smoky "wok hei" flavor that\'s hard to replicate at home. The Gobi Manchurian is a bestseller: crispy cauliflower florets tossed in a tangy, spicy sauce. The chilli chicken is equally popular, with tender pieces in a fiery glaze.',
    image: '/vendor-images/07-dragon-wok-express.jpg', logo: '/vendor-images/07-dragon-wok-express.jpg',
    priceRange: [90, 160],
    location: { address: 'Auto Nagar, Near Gate 2', area: 'Auto Nagar', city: 'Vijayawada', lat: 16.4695, lng: 80.6717 },
    hours: { open: '12:00', close: '22:30', days: 'Tue - Sun' }, phone: '+91 95555 67890', veg: 'both',
    specialties: ['Gobi Manchurian', 'Chilli Chicken', 'Hakka Noodles'], views: 4120, popularity: 78,
  },
  {
    key: 'vendor-8', name: 'Sweet Symphony', cuisine: 'Desserts', categories: ['Desserts'],
    description: 'Traditional Indian sweets — hot jalebis, rasmalai, and gulab jamun made fresh.',
    longDescription: 'Sweet Symphony is a dessert lover\'s paradise. The jalebis are fried fresh every few minutes and dunked in saffron sugar syrup, served piping hot. The rasmalai is soft, spongy, and soaked in cardamom-saffron milk. During festivals, the queue stretches down the street. Their kulfi falooda — with vermicelli, rose syrup, and basil seeds — is the perfect summer cooler.',
    image: '/vendor-images/08-sweet-andhra.jpg', logo: '/vendor-images/08-sweet-andhra.jpg',
    priceRange: [40, 70],
    location: { address: 'Gandhi Nagar, Beside Hanuman Temple', area: 'Gandhi Nagar', city: 'Vijayawada', lat: 16.5113, lng: 80.6475 },
    hours: { open: '10:00', close: '22:00', days: 'Mon - Sun' }, phone: '+91 98888 22334', veg: 'pure-veg',
    specialties: ['Jalebi', 'Gulab Jamun', 'Kulfi Falooda'], views: 6780, popularity: 86,
  },
  {
    key: 'vendor-9', name: 'Irani Chai Adda', cuisine: 'Beverages', categories: ['Tea & Coffee', 'Desserts'],
    description: 'Authentic Irani chai with Osmania biscuits in a vintage tea stall setting.',
    longDescription: 'Irani Chai Adda preserves the old-world charm of Irani cafes. The chai is brewed with khoya (reduced milk) and a blend of tea leaves, giving it a rich, creamy texture unlike any regular tea. Paired with Osmania biscuits — buttery, slightly sweet cookies that dissolve in the mouth — it\'s the perfect afternoon ritual. The stall has been a meeting point for students, workers, and families for generations.',
    image: '/vendor-images/18-irani-chai-adda.jpg', logo: '/vendor-images/18-irani-chai-adda.jpg',
    priceRange: [20, 35],
    location: { address: 'Chitturi Vari Street', area: 'One Town', city: 'Vijayawada', lat: 16.5238, lng: 80.6486 },
    hours: { open: '06:00', close: '21:00', days: 'Mon - Sun' }, phone: '+91 97777 44556', veg: 'both',
    specialties: ['Irani Chai', 'Osmania Biscuits', 'Dum Chai'], views: 4560, popularity: 82,
  },
  {
    key: 'vendor-10', name: 'Andhra Tiffin House', cuisine: 'South Indian', categories: ['Dosa', 'Andhra Meals'],
    description: 'Full Andhra meals and spicy tiffins at unbeatable prices.',
    longDescription: 'Andhra Tiffin House is where you go for a hearty, no-frills meal. Their Andhra meals plate comes with rice, sambar, rasam, two curries, pickle, papad, and curd — unlimited servings for just 120 rupees. The Gongura Chicken Curry is a standout, with the tangy sorrel leaves balancing the heat of the spices. The Pesarattu, a green gram dosa, is a healthy breakfast option unique to the region.',
    image: '/menu-images/39-andhra-meals.jpg', logo: '/menu-images/39-andhra-meals.jpg',
    priceRange: [50, 200],
    location: { address: 'Poranki Road, Near Milk Factory', area: 'Poranki', city: 'Vijayawada', lat: 16.4825, lng: 80.6918 },
    hours: { open: '07:00', close: '22:00', days: 'Mon - Sun' }, phone: '+91 93333 66778', veg: 'both',
    specialties: ['Andhra Meals', 'Gongura Chicken Curry', 'Pesarattu'], views: 5230, popularity: 81,
  },
  {
    key: 'vendor-11', name: 'Hot Bakes', cuisine: 'Street Food', categories: ['Chaat', 'Desserts'],
    description: 'Fresh puffs, cream rolls, and dil khush — a local bakery favorite.',
    longDescription: 'Hot Bakes is a small bakery stall that has been serving fresh puffs and buns for over 15 years. The egg puff, with its flaky pastry and spiced boiled egg filling, is the most popular item and sells out by evening. The cream roll — a soft cone filled with vanilla cream — is a nostalgic treat that reminds locals of their school days. Everything is baked fresh on-site every morning.',
    image: '/menu-images/43-egg-puff.jpg', logo: '/menu-images/43-egg-puff.jpg',
    priceRange: [20, 30],
    location: { address: 'Sastri Nagar, Near Post Office', area: 'Sastri Nagar', city: 'Vijayawada', lat: 16.5089, lng: 80.6352 },
    hours: { open: '07:00', close: '20:00', days: 'Mon - Sat' }, phone: '+91 92222 88990', veg: 'both',
    specialties: ['Egg Puff', 'Veg Puff', 'Cream Roll'], views: 3210, popularity: 70,
  },
  {
    key: 'vendor-12', name: 'Biryani Street', cuisine: 'Biryani', categories: ['Biryani'],
    description: 'Bold, spicy biryani with fry pieces. Not for the faint-hearted.',
    longDescription: 'Biryani Street is for those who like their biryani extra spicy. Their Chicken Fry Piece Biryani uses crispy fried chicken pieces mixed into the rice, giving every bite a crunchy, fiery kick. The Mutton Fry Biryani is equally bold, with slow-cooked mutton that\'s then fried to intensify the flavor. The Gongura Mutton Biryani, available on weekends, is a unique specialty that draws foodies from across the city.',
    image: '/menu-images/47-chicken-fry-piece-biryani.jpg', logo: '/menu-images/47-chicken-fry-piece-biryani.jpg',
    priceRange: [250, 380],
    location: { address: 'Gollapudi, Main Road', area: 'Gollapudi', city: 'Vijayawada', lat: 16.5568, lng: 80.6167 },
    hours: { open: '12:00', close: '23:00', days: 'Mon - Sun' }, phone: '+91 94411 22334', veg: 'non-veg',
    specialties: ['Chicken Fry Piece Biryani', 'Mutton Fry Biryani', 'Gongura Mutton Biryani'], views: 7890, popularity: 87,
  },
  {
    key: 'vendor-13', name: 'Tiffin Junction', cuisine: 'South Indian', categories: ['Dosa'],
    description: 'Quick, affordable tiffins with a spicy Andhra twist.',
    longDescription: 'Tiffin Junction is a morning hotspot for office-goers and students. Their Tawa Idli — idlis tossed on a hot griddle with butter, spices, and chutney powder — is a unique street-side innovation you won\'t find in restaurants. The Karam Dosa, slathered with spicy red chutney and topped with onions, is a fiery breakfast that packs a punch. Quick service and affordable prices make it a daily stop for many locals.',
    image: '/vendor-images/13-tawa-idli-spot.jpg', logo: '/vendor-images/13-tawa-idli-spot.jpg',
    priceRange: [30, 60],
    location: { address: 'Patamata, Near LIC Office', area: 'Patamata', city: 'Vijayawada', lat: 16.4989, lng: 80.6567 },
    hours: { open: '06:30', close: '11:00', days: 'Mon - Sun' }, phone: '+91 91100 99887', veg: 'pure-veg',
    specialties: ['Tawa Idli', 'Karam Dosa', 'Vada'], views: 3890, popularity: 75,
  },
  {
    key: 'vendor-14', name: 'Snack Shack', cuisine: 'Fast Food', categories: ['Burgers', 'Tea & Coffee'],
    description: 'Peri peri fries, loaded nachos, and cold coffee. A youth hangout spot.',
    longDescription: 'Snack Shack is the after-college hangout for the city\'s youth. The peri peri fries, tossed in a smoky spice blend, are the most-ordered item. Loaded nachos with melted cheese, jalapeños, and salsa are perfect for sharing. The cold coffee — thick, creamy, and generously sized — is a summer staple. The shack has a casual, lively vibe with music and outdoor seating.',
    image: '/menu-images/55-peri-peri-fries.jpg', logo: '/menu-images/55-peri-peri-fries.jpg',
    priceRange: [70, 120],
    location: { address: 'Benz Circle, Opp. Ramesh Hospital', area: 'Benz Circle', city: 'Vijayawada', lat: 16.5033, lng: 80.6488 },
    hours: { open: '12:00', close: '23:00', days: 'Mon - Sun' }, phone: '+91 90011 22334', veg: 'both',
    specialties: ['Peri Peri Fries', 'Cheese Nachos', 'Cold Coffee'], views: 2980, popularity: 68,
  },
  {
    key: 'vendor-15', name: 'Coastal Spice Kitchen', cuisine: 'South Indian', categories: ['Andhra Meals'],
    description: 'Traditional Andhra home-style cooking with coastal seafood specialties.',
    longDescription: 'Coastal Spice Kitchen brings the flavors of coastal Andhra to the city. The Gongura Pappu — toor dal cooked with sorrel leaves — is comfort food at its finest, the kind you\'d eat at home. The Royyala Iguru, a spicy prawn curry with onion and masala, showcases the region\'s seafood heritage. The Bendakaya Fry, simple crispy okra, proves that sometimes the simplest dishes are the most satisfying. A taste of home, away from home.',
    image: '/menu-images/60-royyala-iguru.jpg', logo: '/menu-images/60-royyala-iguru.jpg',
    priceRange: [30, 220],
    location: { address: 'Ramarao Nagar, Near Police Station', area: 'Ramarao Nagar', city: 'Vijayawada', lat: 16.4728, lng: 80.6995 },
    hours: { open: '11:00', close: '22:00', days: 'Tue - Sun' }, phone: '+91 93456 78901', veg: 'both',
    specialties: ['Gongura Pappu', 'Royyala Iguru', 'Bendakaya Fry'], views: 4320, popularity: 73,
  },
  {
    key: 'vendor-16', name: 'Bhavanipuram Momo House', cuisine: 'Street Food', categories: ['Momos'],
    description: 'Steamed and fried momos in a cozy Bhavanipuram corner, known for its fiery red chutney.',
    longDescription: 'A newer addition to the Bhavanipuram food scene, this small stall specializes exclusively in momos — steamed, fried, and in soup form. The dough is rolled fresh every morning and the fillings range from spiced vegetables to juicy minced chicken. The homemade red chutney, made with roasted red chilies and garlic, has quickly built a local following.',
    image: '/menu-images/63-steamed-chicken-momos.jpg', logo: '/menu-images/63-steamed-chicken-momos.jpg',
    priceRange: [60, 90],
    location: { address: 'Bhavanipuram Main Road, Near Water Tank', area: 'Bhavanipuram', city: 'Vijayawada', lat: 16.5145, lng: 80.6198 },
    hours: { open: '16:00', close: '21:30', days: 'Tue - Sun' }, phone: '+91 91234 56780', veg: 'both',
    specialties: ['Steamed Chicken Momos', 'Veg Momos', 'Momo Soup'], views: 2140, popularity: 58,
  },
  {
    key: 'vendor-17', name: 'Arabian Twist Rolls', cuisine: 'Fast Food', categories: ['Shawarma'],
    description: 'Char-grilled shawarma rolls and Middle Eastern bites near Kanuru.',
    longDescription: 'Arabian Twist Rolls brought Middle Eastern street food to Kanuru two years ago and has been a favorite for late-night cravings ever since. The chicken is marinated for 24 hours in a house spice blend before hitting the grill, and every roll is wrapped fresh to order. The falafel and hummus are made from scratch daily for the vegetarian crowd.',
    image: '/vendor-images/17-mirchi-grill.jpg', logo: '/vendor-images/17-mirchi-grill.jpg',
    priceRange: [80, 130],
    location: { address: 'Kanuru Main Road, Opp. Bus Stop', area: 'Kanuru', city: 'Vijayawada', lat: 16.4831, lng: 80.6612 },
    hours: { open: '17:00', close: '23:30', days: 'Mon - Sun' }, phone: '+91 91234 56781', veg: 'both',
    specialties: ['Chicken Shawarma Roll', 'Falafel Roll', 'Hummus & Pita'], views: 3050, popularity: 64,
  },
  {
    key: 'vendor-18', name: 'Grill & Bun Co.', cuisine: 'Fast Food', categories: ['Burgers'],
    description: 'Stacked, grilled-to-order burgers and crispy fries in Payakapuram.',
    longDescription: 'Grill & Bun Co. runs a single charcoal grill and a short, focused menu — the idea being that a handful of burgers done well beats a long menu done poorly. Patties are pressed and grilled fresh per order, never pre-formed and frozen. Weekend evenings see a steady line for the Double Cheese Burger, their best-seller by a wide margin.',
    image: '/menu-images/68-double-cheese-burger.jpg', logo: '/menu-images/68-double-cheese-burger.jpg',
    priceRange: [60, 160],
    location: { address: 'Payakapuram Circle, Near Bus Stand', area: 'Payakapuram', city: 'Vijayawada', lat: 16.5223, lng: 80.6301 },
    hours: { open: '12:00', close: '22:00', days: 'Mon - Sun' }, phone: '+91 91234 56782', veg: 'both',
    specialties: ['Double Cheese Burger', 'Veggie Delight Burger', 'Crispy Fries'], views: 4870, popularity: 70,
  },
  {
    key: 'vendor-19', name: 'Krishna Lanka Biryani House', cuisine: 'Biryani', categories: ['Biryani'],
    description: 'Neighborhood dum biryani spot in Krishnalanka, known for consistent daily quality.',
    longDescription: 'Krishna Lanka Biryani House keeps things simple: chicken, egg, and vegetable dum biryani, made the same way every single day. The rice is cooked separately from the meat and layered just before sealing the handi, a technique the owner learned from his father who ran a biryani cart in the same neighborhood for 15 years before him.',
    image: '/menu-images/71-chicken-biryani.jpg', logo: '/menu-images/71-chicken-biryani.jpg',
    priceRange: [150, 210],
    location: { address: 'Krishnalanka Main Road, Near Petrol Bunk', area: 'Krishnalanka', city: 'Vijayawada', lat: 16.5019, lng: 80.6635 },
    hours: { open: '11:30', close: '22:30', days: 'Mon - Sun' }, phone: '+91 91234 56783', veg: 'both',
    specialties: ['Chicken Biryani', 'Egg Biryani', 'Veg Dum Biryani'], views: 6120, popularity: 79,
  },
  {
    key: 'vendor-20', name: 'Currency Nagar Tiffins', cuisine: 'South Indian', categories: ['Dosa', 'Tea & Coffee'],
    description: 'Early-morning tiffin stall in Currency Nagar serving classic South Indian breakfast.',
    longDescription: 'Currency Nagar Tiffins opens at sunrise and is usually sold out of its most popular items by mid-morning. The batter for the dosas and idlis is ground fresh on-site every night, and the filter coffee is brewed in small batches throughout the morning rush so it never sits and goes stale.',
    image: '/vendor-images/20-filter-coffee-lab.jpg', logo: '/vendor-images/20-filter-coffee-lab.jpg',
    priceRange: [25, 60],
    location: { address: 'Currency Nagar 2nd Lane', area: 'Currency Nagar', city: 'Vijayawada', lat: 16.5091, lng: 80.6289 },
    hours: { open: '06:00', close: '11:00', days: 'Mon - Sun' }, phone: '+91 91234 56784', veg: 'pure-veg',
    specialties: ['Plain Dosa', 'Rava Idli', 'South Indian Filter Coffee'], views: 3420, popularity: 67,
  },
];

// ---------------------------------------------------------------------------
// Menu items — ported from frontend/src/data/vendors.ts `menuItems` map.
// ---------------------------------------------------------------------------

interface MenuItemSeed {
  name: string; description: string; price: number; veg: MenuItemVegStatus;
  image: string; popular: boolean; category: FoodCategory; available: boolean;
}

const MENU_ITEMS: Record<string, MenuItemSeed[]> = {
  'vendor-1': [
    { name: 'Chicken Dum Biryani', description: 'Slow-cooked basmati rice with tender chicken, saffron, and traditional Andhra spices. Served with raita and salan.', price: 220, veg: 'non-veg', image: '/menu-images/01-chicken-dum-biryani.jpg', popular: true, category: 'Biryani', available: true },
    { name: 'Mutton Biryani', description: 'Rich, aromatic mutton biryani with layered rice and slow-cooked meat falling off the bone.', price: 320, veg: 'non-veg', image: '/menu-images/02-mutton-biryani.jpg', popular: true, category: 'Biryani', available: true },
    { name: 'Veg Biryani', description: 'Fragrant basmati rice with mixed vegetables, cashews, and mild spices. A vegetarian delight.', price: 160, veg: 'veg', image: '/menu-images/03-veg-biryani.jpg', popular: false, category: 'Biryani', available: true },
    { name: 'Chicken 65', description: 'Spicy deep-fried chicken bites with curry leaves, green chilies, and a tangy kick.', price: 180, veg: 'non-veg', image: '/menu-images/04-chicken-65.jpg', popular: true, category: 'Biryani', available: true },
    { name: 'Double Ka Meetha', description: 'Traditional Hyderabadi bread pudding soaked in saffron milk and topped with nuts.', price: 90, veg: 'veg', image: '/menu-images/05-double-ka-meetha.jpg', popular: false, category: 'Desserts', available: true },
  ],
  'vendor-2': [
    { name: 'Masala Dosa', description: 'Crispy golden dosa stuffed with spiced potato masala. Served with coconut chutney and sambar.', price: 80, veg: 'veg', image: '/menu-images/06-masala-dosa.jpg', popular: true, category: 'Dosa', available: true },
    { name: 'Paneer Dosa', description: 'Dosa filled with cottage cheese, onions, and mild spices. A rich twist on the classic.', price: 120, veg: 'veg', image: '/menu-images/07-paneer-dosa.jpg', popular: true, category: 'Dosa', available: true },
    { name: 'Idli Sambar', description: 'Steamed rice cakes served with hot sambar and coconut chutney. Soft and fluffy.', price: 50, veg: 'veg', image: '/menu-images/08-idli-sambar.jpg', popular: false, category: 'Dosa', available: true },
    { name: 'Punugulu', description: 'Deep-fried crispy lentil fritters, a local Andhra breakfast favorite. Served with chutney.', price: 40, veg: 'veg', image: '/menu-images/09-punugulu.jpg', popular: true, category: 'Dosa', available: true },
    { name: 'Filter Coffee', description: 'Authentic South Indian filter coffee, frothy and strong. Served in a steel tumbler.', price: 25, veg: 'veg', image: '/menu-images/10-filter-coffee.jpg', popular: false, category: 'Tea & Coffee', available: true },
  ],
  'vendor-3': [
    { name: 'Mirchi Bajji', description: 'Large green chilies stuffed with spiced potato, dipped in gram flour batter and deep-fried.', price: 30, veg: 'veg', image: '/menu-images/11-mirchi-bajji.jpg', popular: true, category: 'Chaat', available: true },
    { name: 'Pani Puri', description: 'Crispy hollow puris filled with spicy tangy water, chickpeas, and potato. A street food legend.', price: 50, veg: 'veg', image: '/menu-images/12-pani-puri.jpg', popular: true, category: 'Chaat', available: true },
    { name: 'Samosa', description: 'Crispy pastry pocket stuffed with spiced potatoes and peas. Served with tamarind chutney.', price: 20, veg: 'veg', image: '/menu-images/13-samosa.jpg', popular: false, category: 'Chaat', available: true },
    { name: 'Dahi Puri', description: 'Puris topped with yogurt, sweet chutney, pomegranate, and sev. A burst of flavors.', price: 60, veg: 'veg', image: '/menu-images/14-dahi-puri.jpg', popular: false, category: 'Chaat', available: true },
  ],
  'vendor-4': [
    { name: 'Steamed Momos', description: 'Soft steamed dumplings filled with spiced vegetables or chicken. Served with fiery red chutney.', price: 60, veg: 'veg', image: '/menu-images/15-steamed-momos.jpg', popular: true, category: 'Momos', available: true },
    { name: 'Fried Momos', description: 'Crispy on the outside, juicy inside. Pan-fried momos with a choice of fillings.', price: 80, veg: 'non-veg', image: '/menu-images/16-fried-momos.jpg', popular: true, category: 'Momos', available: true },
    { name: 'Chicken Momos', description: 'Juicy minced chicken filling wrapped in thin dough. Steamed to perfection.', price: 90, veg: 'non-veg', image: '/menu-images/17-chicken-momos.jpg', popular: false, category: 'Momos', available: true },
    { name: 'Thukpa Soup', description: 'Tibetan noodle soup with vegetables and chicken in a rich, warming broth.', price: 100, veg: 'non-veg', image: '/menu-images/18-thukpa-soup.jpg', popular: false, category: 'Momos', available: true },
  ],
  'vendor-5': [
    { name: 'Chicken Shawarma', description: 'Marinated chicken wrapped in warm pita with garlic sauce, pickles, and fresh veggies.', price: 120, veg: 'non-veg', image: '/menu-images/19-chicken-shawarma.jpg', popular: true, category: 'Shawarma', available: true },
    { name: 'Paneer Shawarma', description: 'Grilled paneer wrapped in pita with mint chutney, onions, and crunchy veggies.', price: 100, veg: 'veg', image: '/menu-images/20-paneer-shawarma.jpg', popular: false, category: 'Shawarma', available: true },
    { name: 'Falafel Wrap', description: 'Crispy chickpea falafel in pita with tahini, hummus, and fresh salad.', price: 90, veg: 'veg', image: '/menu-images/21-falafel-wrap.jpg', popular: false, category: 'Shawarma', available: true },
    { name: 'Hummus & Pita', description: 'Creamy hummus with olive oil, paprika, and warm pita bread for dipping.', price: 80, veg: 'veg', image: '/menu-images/22-hummus-and-pita.jpg', popular: false, category: 'Shawarma', available: true },
  ],
  'vendor-6': [
    { name: 'Classic Veg Burger', description: 'Crispy veg patty with lettuce, tomato, cheese, and house sauce in a toasted bun.', price: 90, veg: 'veg', image: '/menu-images/23-classic-veg-burger.jpg', popular: true, category: 'Burgers', available: true },
    { name: 'Chicken Cheese Burger', description: 'Juicy grilled chicken patty with melted cheese, caramelized onions, and smoky mayo.', price: 140, veg: 'non-veg', image: '/menu-images/24-chicken-cheese-burger.jpg', popular: true, category: 'Burgers', available: true },
    { name: 'Loaded Fries', description: 'Crispy fries topped with cheese sauce, jalapeños, and herbs. A perfect side.', price: 70, veg: 'veg', image: '/menu-images/25-loaded-fries.jpg', popular: false, category: 'Burgers', available: true },
    { name: 'Chocolate Milkshake', description: 'Thick chocolate milkshake topped with whipped cream and a cherry.', price: 80, veg: 'veg', image: '/menu-images/26-chocolate-milkshake.jpg', popular: false, category: 'Desserts', available: true },
  ],
  'vendor-7': [
    { name: 'Gobi Manchurian', description: 'Crispy cauliflower in a tangy Indo-Chinese sauce with bell peppers and spring onions.', price: 110, veg: 'veg', image: '/menu-images/27-gobi-manchurian.jpg', popular: true, category: 'Chinese', available: true },
    { name: 'Hakka Noodles', description: 'Stir-fried noodles with vegetables, soy sauce, and a smoky wok flavor.', price: 100, veg: 'veg', image: '/menu-images/28-hakka-noodles.jpg', popular: false, category: 'Chinese', available: true },
    { name: 'Chilli Chicken', description: 'Spicy battered chicken with onions, peppers, and a fiery chili sauce.', price: 160, veg: 'non-veg', image: '/menu-images/29-chilli-chicken.jpg', popular: true, category: 'Chinese', available: true },
    { name: 'Veg Fried Rice', description: 'Wok-tossed rice with mixed vegetables, garlic, and soy. Simple and satisfying.', price: 90, veg: 'veg', image: '/menu-images/30-veg-fried-rice.jpg', popular: false, category: 'Chinese', available: true },
  ],
  'vendor-8': [
    { name: 'Jalebi', description: 'Spiral-shaped sweet soaked in saffron sugar syrup. Crispy outside, juicy inside.', price: 40, veg: 'veg', image: '/menu-images/31-jalebi.jpg', popular: true, category: 'Desserts', available: true },
    { name: 'Rasmalai', description: 'Soft cheese dumplings soaked in cardamom saffron milk, garnished with pistachios.', price: 60, veg: 'veg', image: '/menu-images/32-rasmalai.jpg', popular: false, category: 'Desserts', available: true },
    { name: 'Gulab Jamun', description: 'Warm, golden-brown dumplings in rose-scented sugar syrup. A timeless classic.', price: 50, veg: 'veg', image: '/menu-images/33-gulab-jamun.jpg', popular: true, category: 'Desserts', available: true },
    { name: 'Kulfi Falooda', description: 'Traditional Indian ice cream with vermicelli, rose syrup, and basil seeds.', price: 70, veg: 'veg', image: '/menu-images/34-kulfi-falooda.jpg', popular: false, category: 'Desserts', available: true },
  ],
  'vendor-9': [
    { name: 'Irani Chai', description: 'Rich, creamy Persian-style tea with khoya and cardamom. Served with Osmania biscuits.', price: 30, veg: 'veg', image: '/menu-images/35-irani-chai.jpg', popular: true, category: 'Tea & Coffee', available: true },
    { name: 'Osmania Biscuits', description: 'Buttery, melt-in-your-mouth cookies that pair perfectly with Irani chai.', price: 25, veg: 'veg', image: '/menu-images/36-osmania-biscuits.jpg', popular: false, category: 'Desserts', available: true },
    { name: 'Dum Chai', description: 'Strong, aromatic spiced tea slow-brewed with cardamom, ginger, and clove.', price: 20, veg: 'veg', image: '/menu-images/76-dum-chai.jpg', popular: false, category: 'Tea & Coffee', available: true },
    { name: 'Mutton Samosa', description: 'Flaky pastry stuffed with spiced minced mutton. A savory tea-time snack.', price: 35, veg: 'non-veg', image: '/menu-images/38-mutton-samosa.jpg', popular: false, category: 'Chaat', available: true },
  ],
  'vendor-10': [
    { name: 'Andhra Meals', description: 'Full plate with rice, sambar, rasam, curries, pickle, papad, and curd. Unlimited servings.', price: 120, veg: 'veg', image: '/menu-images/39-andhra-meals.jpg', popular: true, category: 'Andhra Meals', available: true },
    { name: 'Gongura Chicken Curry', description: 'Spicy chicken cooked with sorrel leaves. A signature Andhra delicacy.', price: 200, veg: 'non-veg', image: '/menu-images/40-gongura-chicken-curry.jpg', popular: true, category: 'Andhra Meals', available: true },
    { name: 'Pesarattu', description: 'Green gram dosa, crispy and healthy. Served with ginger chutney.', price: 60, veg: 'veg', image: '/menu-images/41-pesarattu.jpg', popular: false, category: 'Dosa', available: true },
    { name: 'Pulihora', description: 'Tangy tamarind rice with peanuts, curry leaves, and a hint of spice.', price: 50, veg: 'veg', image: '/menu-images/42-pulihora.jpg', popular: false, category: 'Andhra Meals', available: true },
  ],
  'vendor-11': [
    { name: 'Egg Puff', description: 'Flaky puff pastry with a spiced boiled egg filling. A bakery classic.', price: 25, veg: 'egg', image: '/menu-images/43-egg-puff.jpg', popular: true, category: 'Chaat', available: true },
    { name: 'Veg Puff', description: 'Crispy pastry filled with spiced mixed vegetables. A quick, satisfying snack.', price: 20, veg: 'veg', image: '/menu-images/44-veg-puff.jpg', popular: false, category: 'Chaat', available: true },
    { name: 'Cream Roll', description: 'Soft pastry cone filled with sweet vanilla cream. A nostalgic treat.', price: 30, veg: 'veg', image: '/menu-images/45-cream-roll.jpg', popular: false, category: 'Desserts', available: true },
    { name: 'Dil Khush', description: 'Sweet coconut-filled bun, a local bakery specialty. Soft and fragrant.', price: 25, veg: 'veg', image: '/menu-images/46-dil-khush.jpg', popular: false, category: 'Desserts', available: true },
  ],
  'vendor-12': [
    { name: 'Chicken Fry Piece Biryani', description: 'Biryani with crispy fried chicken pieces, extra spice, and bold Andhra flavors.', price: 250, veg: 'non-veg', image: '/menu-images/47-chicken-fry-piece-biryani.jpg', popular: true, category: 'Biryani', available: true },
    { name: 'Mutton Fry Biryani', description: 'Spicy mutton fry mixed with aromatic rice. A heavy, satisfying meal.', price: 350, veg: 'non-veg', image: '/menu-images/48-mutton-fry-biryani.jpg', popular: true, category: 'Biryani', available: true },
    { name: 'Boneless Chicken Biryani', description: 'Tender boneless chicken in fragrant rice. Easy to eat, packed with flavor.', price: 280, veg: 'non-veg', image: '/menu-images/49-boneless-chicken-biryani.jpg', popular: false, category: 'Biryani', available: true },
    { name: 'Gongura Mutton Biryani', description: 'Mutton biryani with tangy gongura leaves. A unique regional specialty.', price: 380, veg: 'non-veg', image: '/menu-images/50-gongura-mutton-biryani.jpg', popular: false, category: 'Biryani', available: false },
  ],
  'vendor-13': [
    { name: 'Tawa Idli', description: 'Idlis tossed on a hot tawa with butter, spices, and chutney powder. A street twist.', price: 60, veg: 'veg', image: '/menu-images/51-tawa-idli.jpg', popular: true, category: 'Dosa', available: true },
    { name: 'Karam Dosa', description: 'Spicy red chutney dosa with onion topping. A fiery Andhra street favorite.', price: 50, veg: 'veg', image: '/menu-images/77-karam-dosa.jpg', popular: true, category: 'Dosa', available: true },
    { name: 'Upma', description: 'Savory semolina porridge with vegetables, peanuts, and curry leaves.', price: 40, veg: 'veg', image: '/menu-images/53-upma.jpg', popular: false, category: 'Dosa', available: true },
    { name: 'Vada', description: 'Crispy deep-fried lentil donuts. Served with sambar and chutney.', price: 30, veg: 'veg', image: '/menu-images/54-vada.jpg', popular: false, category: 'Dosa', available: true },
  ],
  'vendor-14': [
    { name: 'Peri Peri Fries', description: 'Crispy fries tossed in smoky peri peri spice. A fiery, addictive snack.', price: 80, veg: 'veg', image: '/menu-images/55-peri-peri-fries.jpg', popular: true, category: 'Burgers', available: true },
    { name: 'Cheese Nachos', description: 'Loaded nachos with melted cheese, jalapeños, salsa, and sour cream.', price: 120, veg: 'veg', image: '/menu-images/56-cheese-nachos.jpg', popular: false, category: 'Burgers', available: true },
    { name: 'Veg Wrap', description: 'Grilled veggies, cheese, and sauce wrapped in a soft tortilla. On-the-go meal.', price: 90, veg: 'veg', image: '/menu-images/57-veg-wrap.jpg', popular: false, category: 'Burgers', available: true },
    { name: 'Cold Coffee', description: 'Blended cold coffee, thick and creamy. Perfect for a hot afternoon.', price: 70, veg: 'veg', image: '/menu-images/78-cold-coffee.jpg', popular: false, category: 'Tea & Coffee', available: true },
  ],
  'vendor-15': [
    { name: 'Gongura Pappu', description: 'Toor dal cooked with sorrel leaves and spices. A traditional Andhra comfort food.', price: 80, veg: 'veg', image: '/menu-images/59-gongura-pappu.jpg', popular: true, category: 'Andhra Meals', available: true },
    { name: 'Royyala Iguru', description: 'Spicy prawn curry with onion and masala. A coastal Andhra specialty.', price: 220, veg: 'non-veg', image: '/menu-images/60-royyala-iguru.jpg', popular: false, category: 'Andhra Meals', available: true },
    { name: 'Bendakaya Fry', description: 'Crispy okra fry with minimal spices. Simple, crunchy, and delicious.', price: 60, veg: 'veg', image: '/menu-images/61-bendakaya-fry.jpg', popular: false, category: 'Andhra Meals', available: true },
    { name: 'Pappu Chekkalu', description: 'Crispy rice and lentil crackers. A traditional tea-time snack.', price: 30, veg: 'veg', image: '/menu-images/62-pappu-chekkalu.jpg', popular: false, category: 'Desserts', available: true },
  ],
  'vendor-16': [
    { name: 'Steamed Chicken Momos', description: 'Juicy minced chicken dumplings, steamed fresh to order. Served with spicy red chutney.', price: 90, veg: 'non-veg', image: '/menu-images/63-steamed-chicken-momos.jpg', popular: true, category: 'Momos', available: true },
    { name: 'Veg Momos', description: 'Steamed dumplings packed with finely chopped cabbage, carrot, and spring onion.', price: 70, veg: 'veg', image: '/menu-images/64-veg-momos.jpg', popular: false, category: 'Momos', available: true },
    { name: 'Momo Soup', description: 'Warm, peppery broth with a handful of momos dropped in. Comfort food on a rainy evening.', price: 60, veg: 'veg', image: '/menu-images/65-momo-soup.jpg', popular: false, category: 'Momos', available: true },
  ],
  'vendor-17': [
    { name: 'Chicken Shawarma Roll', description: 'Char-grilled chicken shavings wrapped tight with garlic mayo and pickled vegetables.', price: 130, veg: 'non-veg', image: '/menu-images/66-chicken-shawarma-roll.jpg', popular: true, category: 'Shawarma', available: true },
    { name: 'Falafel Roll', description: 'Crispy chickpea falafel with tahini and fresh salad in warm pita bread.', price: 100, veg: 'veg', image: '/menu-images/67-falafel-roll.jpg', popular: false, category: 'Shawarma', available: true },
    { name: 'Hummus & Pita', description: 'Creamy house-made hummus served with warm pita triangles for dipping.', price: 80, veg: 'veg', image: '/menu-images/22-hummus-and-pita.jpg', popular: false, category: 'Shawarma', available: true },
  ],
  'vendor-18': [
    { name: 'Double Cheese Burger', description: 'Two grilled patties, double cheese, and smoky barbecue sauce in a toasted brioche bun.', price: 160, veg: 'non-veg', image: '/menu-images/68-double-cheese-burger.jpg', popular: true, category: 'Burgers', available: true },
    { name: 'Veggie Delight Burger', description: 'A crisp vegetable patty with lettuce, tomato, and mint mayo.', price: 110, veg: 'veg', image: '/menu-images/69-veggie-delight-burger.jpg', popular: false, category: 'Burgers', available: true },
    { name: 'Crispy Fries', description: 'Golden, salted fries served hot and crunchy.', price: 60, veg: 'veg', image: '/menu-images/70-crispy-fries.jpg', popular: false, category: 'Burgers', available: true },
  ],
  'vendor-19': [
    { name: 'Chicken Biryani', description: 'Classic dum-cooked chicken biryani with long-grain basmati and house spices.', price: 210, veg: 'non-veg', image: '/menu-images/71-chicken-biryani.jpg', popular: true, category: 'Biryani', available: true },
    { name: 'Egg Biryani', description: 'Fragrant biryani rice layered with boiled eggs and fried onions.', price: 170, veg: 'egg', image: '/menu-images/72-egg-biryani.jpg', popular: false, category: 'Biryani', available: true },
    { name: 'Veg Dum Biryani', description: 'Mixed vegetables and basmati rice, slow-cooked with whole spices.', price: 150, veg: 'veg', image: '/menu-images/73-veg-dum-biryani.jpg', popular: false, category: 'Biryani', available: true },
  ],
  'vendor-20': [
    { name: 'Plain Dosa', description: 'Thin, crisp fermented-rice-and-lentil crepe served with chutney and sambar.', price: 60, veg: 'veg', image: '/menu-images/74-plain-dosa.jpg', popular: true, category: 'Dosa', available: true },
    { name: 'Rava Idli', description: 'Soft semolina idlis studded with cashews and curry leaves.', price: 50, veg: 'veg', image: '/menu-images/75-rava-idli.jpg', popular: false, category: 'Dosa', available: true },
    { name: 'South Indian Filter Coffee', description: 'Strong decoction coffee with frothy milk, served in a steel tumbler and dabara.', price: 25, veg: 'veg', image: '/menu-images/76-south-indian-filter-coffee.jpg', popular: false, category: 'Tea & Coffee', available: true },
  ],
};

// ---------------------------------------------------------------------------
// Reviews — ported verbatim from frontend/src/data/vendors.ts `reviews`
// array. These are real people, real comments, real ratings: the vendor's
// rating/reviewCount fields are computed FROM these (plus the supplementary
// reviews generated further down), not set directly.
// ---------------------------------------------------------------------------

interface ReviewSeed {
  vendorKey: string; author: string; avatar: string; rating: number; comment: string; daysAgo: number;
}

const CURATED_REVIEWS: ReviewSeed[] = [
  { vendorKey: 'vendor-1', author: 'Ravi Kumar', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, comment: 'Best biryani in Vijayawada, hands down. The mutton just melts in your mouth. Been coming here for 5 years and the quality never drops.', daysAgo: 2 },
  { vendorKey: 'vendor-1', author: 'Lakshmi Rao', avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 4, comment: 'Loved the chicken dum biryani. Spicy and flavorful. The Chicken 65 is a must-try. Only wish the wait was shorter on weekends.', daysAgo: 7 },
  { vendorKey: 'vendor-1', author: 'Sai Teja', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, comment: 'The secret spice blend is unreal. You can taste every layer. Worth every rupee.', daysAgo: 14 },
  { vendorKey: 'vendor-2', author: 'Priya Sharma', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, comment: 'The punugulu here are the best I\'ve had anywhere. Crispy outside, soft inside. Get there early because they sell out fast!', daysAgo: 3 },
  { vendorKey: 'vendor-2', author: 'Krishna Murthy', avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 4, comment: 'Authentic South Indian breakfast. The dosa is perfectly crispy and the chutney is fresh. Filter coffee is the perfect ending.', daysAgo: 7 },
  { vendorKey: 'vendor-3', author: 'Anjali Devi', avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, comment: 'The mirchi bajji here is addictive! Perfect amount of spice and the potato stuffing is delicious. My evening snack spot.', daysAgo: 5 },
  { vendorKey: 'vendor-3', author: 'Venkat Reddy', avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 4, comment: 'Pani puri water is the best in Guntur. Tangy, spicy, and perfectly balanced. Always a crowd but worth the wait.', daysAgo: 14 },
  { vendorKey: 'vendor-4', author: 'Deepak Singh', avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 4, comment: 'The red chutney is fire! Literally. Momos are juicy and fresh. The fried version is even better. Great value for money.', daysAgo: 7 },
  { vendorKey: 'vendor-5', author: 'Fatima Begum', avatar: 'https://images.pexels.com/photos/3692898/pexels-photo-3692898.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, comment: 'The garlic sauce is what makes this shawarma special. Chicken is perfectly marinated and the wrap is always fresh. My go-to dinner.', daysAgo: 4 },
  { vendorKey: 'vendor-5', author: 'Arjun Nair', avatar: 'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 4, comment: 'Good shawarma, generous portion size. The falafel wrap is surprisingly good for a non-Middle Eastern place.', daysAgo: 14 },
  { vendorKey: 'vendor-6', author: 'Harika Reddy', avatar: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 4, comment: 'The loaded fries are amazing! Cheese sauce is real, not that fake stuff. Burger is juicy and the shakes are thick.', daysAgo: 6 },
  { vendorKey: 'vendor-8', author: 'Suresh Babu', avatar: 'https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, comment: 'Hot jalebis straight from the kadai. Crispy, juicy, and perfectly sweet. The rasmalai is also fantastic. A sweet tooth\'s dream.', daysAgo: 3 },
  { vendorKey: 'vendor-9', author: 'Meena Kumari', avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, comment: 'The Irani chai here is the best in the city. Creamy, rich, and perfectly paired with Osmania biscuits. A daily ritual for me.', daysAgo: 7 },
  { vendorKey: 'vendor-10', author: 'Naga Raju', avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 4, comment: 'The Andhra meals plate is unbeatable for the price. Unlimited rice, two curries, sambar, rasam, and curd. The gongura chicken is a must-order.', daysAgo: 5 },
  { vendorKey: 'vendor-12', author: 'Pavan Kalyan', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, comment: 'If you love spicy food, this is your place. The fry piece biryani is next level. Not for people who can\'t handle heat!', daysAgo: 7 },
  { vendorKey: 'vendor-13', author: 'Swathi Reddy', avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 4, comment: 'The tawa idli is a genius idea. Buttery, spicy, and so flavorful. The karam dosa is also great for a quick spicy breakfast.', daysAgo: 4 },
  { vendorKey: 'vendor-15', author: 'Gopi Krishna', avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, comment: 'Tastes just like home cooking. The gongura pappu is exactly how my mother makes it. The royyala iguru is fresh and perfectly spiced.', daysAgo: 14 },
  { vendorKey: 'vendor-16', author: 'Chandana Rao', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 4, comment: 'Small stall but the chicken momos are seriously good. Red chutney has real heat to it. New favorite evening snack spot.', daysAgo: 3 },
  { vendorKey: 'vendor-17', author: 'Imran Sheikh', avatar: 'https://images.pexels.com/photos/3692898/pexels-photo-3692898.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 4, comment: 'Best shawarma roll in Kanuru, hands down. Chicken is tender and the garlic sauce isn\'t overpowering. Generous portions too.', daysAgo: 7 },
  { vendorKey: 'vendor-18', author: 'Rohit Varma', avatar: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, comment: 'The double cheese burger is massive and actually grilled fresh, you can tell. Fries are always hot and crispy. Worth the short wait.', daysAgo: 5 },
  { vendorKey: 'vendor-19', author: 'Divya Sri', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 4, comment: 'Consistent quality every time I order. Chicken biryani has a good amount of masala without being overly oily.', daysAgo: 6 },
  { vendorKey: 'vendor-20', author: 'Bhaskar Rao', avatar: 'https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, comment: 'My daily breakfast stop. Dosas are crispy, idlis are soft, and the filter coffee is exactly the right strength. Never disappoints.', daysAgo: 2 },
];

// Supplementary, clearly-labeled-as-such reviews so every vendor has a
// believable amount of activity instead of just 0-1 curated reviews. These
// are real Review documents too — just synthesized rather than hand-written
// — and they respect the same one-review-per-user constraint as everything
// else.
const FILLER_TEMPLATES: Array<(specialty: string) => string> = [
  (specialty) => `The ${specialty} here is genuinely great. Will be back.`,
  (specialty) => `Tried the ${specialty} on a friend's recommendation — did not disappoint.`,
  (specialty) => `Solid ${specialty}, fair prices, quick service.`,
  (specialty) => `${specialty} was fresh and tasty. A bit of a wait during peak hours though.`,
  (specialty) => `My go-to order here is the ${specialty}. Consistent every time.`,
  (specialty) => `Good value for money. The ${specialty} is their standout dish.`,
  (specialty) => `Came for the ${specialty}, stayed for everything else on the menu.`,
  (specialty) => `Decent spot. The ${specialty} could use a little more spice for my taste.`,
];

const FILLER_CUSTOMERS: Array<[string, string]> = [
  ['Aditya Rao', 'aditya.rao'], ['Neha Verma', 'neha.verma'], ['Kiran Kumar', 'kiran.kumar'],
  ['Sowmya Reddy', 'sowmya.reddy'], ['Manoj Prasad', 'manoj.prasad'], ['Pooja Iyer', 'pooja.iyer'],
  ['Ashok Naidu', 'ashok.naidu'], ['Radhika Menon', 'radhika.menon'], ['Vikram Chowdary', 'vikram.chowdary'],
  ['Sneha Pillai', 'sneha.pillai'], ['Ramesh Babu', 'ramesh.babu'], ['Kavya Nair', 'kavya.nair'],
  ['Srinivas Rao', 'srinivas.rao'], ['Anitha George', 'anitha.george'], ['Naveen Kumar', 'naveen.kumar'],
  ['Deepika Shetty', 'deepika.shetty'], ['Praveen Achary', 'praveen.achary'], ['Lavanya Menon', 'lavanya.menon'],
  ['Sandeep Rao', 'sandeep.rao'], ['Ritu Agarwal', 'ritu.agarwal'],
];

const FILLER_AVATARS = [
  'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100',
  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100',
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100',
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100',
  'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100',
  'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=100',
  'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=100',
];

// ---------------------------------------------------------------------------
// Offers — ported from frontend/src/data/content.ts `offers`. Expiry dates
// are relative to "now" so a freshly seeded DB always has live offers.
// ---------------------------------------------------------------------------

interface OfferSeed {
  vendorKey: string; title: string; description: string; discount: string; code: string;
  conditions: string; color: string; expiresInDays: number;
}

const OFFERS: OfferSeed[] = [
  { vendorKey: 'vendor-1', title: '20% off on Mutton Biryani', description: 'Get 20% off on the legendary Mutton Biryani every Tuesday. Dine-in only.', discount: '20% OFF', code: 'SPICE20', conditions: 'Valid on Tuesdays only. Dine-in only. Max 2 per table.', color: 'from-brand-500 to-rose-500', expiresInDays: 30 },
  { vendorKey: 'vendor-5', title: 'Buy 1 Get 1 Shawarma', description: 'Buy one Chicken Shawarma, get one free. Available from 9 PM to midnight.', discount: 'BOGO', code: 'WRAP241', conditions: 'Valid daily 9 PM - 12 AM. Equal or lesser value free.', color: 'from-charcoal-700 to-charcoal-900', expiresInDays: 45 },
  { vendorKey: 'vendor-2', title: 'Free Filter Coffee', description: 'Complimentary filter coffee with any dosa order. Morning special.', discount: 'FREE COFFEE', code: 'DOSACOFFEE', conditions: 'One coffee per dosa order. Valid before 10 AM.', color: 'from-gold-500 to-brand-600', expiresInDays: 20 },
  { vendorKey: 'vendor-6', title: 'Combo: Burger + Fries + Shake', description: 'Get a veg burger, loaded fries, and chocolate shake for just 199 rupees.', discount: 'SAVE 80', code: 'COMBO199', conditions: 'Veg combo only. Cannot be combined with other offers.', color: 'from-teal-500 to-teal-700', expiresInDays: 60 },
  { vendorKey: 'vendor-4', title: '30% off after 9 PM', description: 'Late night owl special — 30% off all momos after 9 PM.', discount: '30% OFF', code: 'NIGHT30', conditions: 'Valid daily after 9 PM. Dine-in and takeout.', color: 'from-brand-600 to-rose-700', expiresInDays: 25 },
  { vendorKey: 'vendor-8', title: 'Sweet Duo: Jalebi + Rasmalai', description: 'Two classic desserts for the price of one. A sweet tooth\'s dream.', discount: '1+1 OFFER', code: 'SWEET11', conditions: 'One per customer. Both items must be same size.', color: 'from-gold-400 to-rose-500', expiresInDays: 35 },
];

// ---------------------------------------------------------------------------
// Events — ported from frontend/src/data/content.ts `events`. Dates are
// relative to "now" so events are always upcoming on a fresh seed.
// ---------------------------------------------------------------------------

interface EventSeed {
  name: string; description: string; longDescription: string; image: string;
  daysFromNow: number; time: string; location: string; area: string;
  vendorKeys: string[]; featured: boolean;
}

const EVENTS: EventSeed[] = [
  {
    name: 'Vijayawada Food Festival',
    description: 'The biggest street food festival in the city. 50+ vendors, live cooking, and music.',
    longDescription: 'Experience the ultimate celebration of street food at the Vijayawada Food Festival. Over 50 local vendors will gather to showcase their best dishes, from legendary biryani to creative fusion street food. Enjoy live cooking demonstrations by renowned local chefs, a spice-eating contest, traditional music performances, and a dedicated kids\' zone. The festival spans two days and features a "Best Biryani" competition judged by attendees. Entry is free, and food coupons are available at the gate.',
    image: '/vendor-images/09-irani-chai-house.jpg', daysFromNow: 16, time: '4:00 PM - 11:00 PM',
    location: 'PWD Grounds, Vijayawada', area: 'Governorpet',
    vendorKeys: ['vendor-1', 'vendor-3', 'vendor-5', 'vendor-8', 'vendor-12'], featured: true,
  },
  {
    name: 'Dosa Night Market',
    description: 'An evening dedicated to dosas in all forms. Live dosa counters and chutney tasting.',
    longDescription: 'The Dosa Night Market is a unique evening event celebrating the humble dosa in all its glory. Watch as skilled cooks prepare over 20 varieties of dosas on live counters — from classic masala to innovative paneer, cheese, and chocolate dosas. A chutney tasting bar features 10 different chutneys from across South India. Live music, outdoor seating under fairy lights, and a festive atmosphere make this a perfect family evening.',
    image: '/vendor-images/01-vijay-food-co.jpg', daysFromNow: 27, time: '6:00 PM - 10:00 PM',
    location: 'Raghavayya Park, MG Road', area: 'Labbipet',
    vendorKeys: ['vendor-2', 'vendor-10', 'vendor-13'], featured: true,
  },
  {
    name: 'Spice Challenge',
    description: 'Can you handle the heat? A spice-eating competition with prizes for the bravest.',
    longDescription: 'Think you can handle the spiciest food in Andhra? The Spice Challenge is a competitive eating event where participants face off across three rounds: Mirchi Bajji, Guntur-style Chicken 65, and the infamous Ghost Pepper Biryani. Prizes include cash rewards, StreetSide reward points, and the title of "Spice Champion". Spectators welcome — enjoy food stalls, music, and the spectacle of watching others suffer. Registration is free but limited to 50 participants.',
    image: '/vendor-images/03-guntur-street-bites.jpg', daysFromNow: 42, time: '5:00 PM - 8:00 PM',
    location: 'Tummalapalli Kalakshetram', area: 'Suryaraopet',
    vendorKeys: ['vendor-3', 'vendor-1', 'vendor-12'], featured: false,
  },
  {
    name: 'Monsoon Chaat Mela',
    description: 'Celebrate the rains with the best chaat from across the region. Pani puri, dahi puri, and more.',
    longDescription: 'There\'s nothing quite like hot, tangy chaat on a rainy evening. The Monsoon Chaat Mela brings together 15 chaat vendors serving pani puri, dahi puri, samosa chaat, aloo tikki, and creative fusion chaat you won\'t find anywhere else. A "Best Pani Puri" contest lets attendees vote for their favorite. Live folk music and a rain-themed decor complete the experience. Come hungry, leave happy.',
    image: '/vendor-images/02-spice-trail.jpg', daysFromNow: 9, time: '4:00 PM - 9:00 PM',
    location: 'Gandhi Park, Bandar Road', area: 'Suryaraopet',
    vendorKeys: ['vendor-3', 'vendor-7', 'vendor-11'], featured: false,
  },
];

// ---------------------------------------------------------------------------
// Food trails — ported from frontend/src/data/content.ts `foodTrails`.
// ---------------------------------------------------------------------------

interface TrailSeed {
  name: string; description: string; image: string; duration: string; distance: string;
  difficulty: 'Easy' | 'Moderate' | 'Foodie'; rating: number; reviewCount: number;
  stops: Array<{ vendorKey: string; note: string }>;
}

const TRAILS: TrailSeed[] = [
  {
    name: 'Vijayawada Spicy Trail',
    description: 'A fiery journey through the most iconic spicy food spots in Vijayawada. From legendary biryani to Guntur-style mirchi bajji, this trail is for heat lovers only.',
    image: '/vendor-images/09-irani-chai-house.jpg', duration: '3-4 hours', distance: '6.5 km', difficulty: 'Foodie', rating: 4.8, reviewCount: 234,
    stops: [
      { vendorKey: 'vendor-1', note: 'Start with the legendary Chicken Dum Biryani' },
      { vendorKey: 'vendor-3', note: 'Fiery Mirchi Bajji and Pani Puri' },
      { vendorKey: 'vendor-12', note: 'Spicy Fry Piece Biryani' },
      { vendorKey: 'vendor-8', note: 'Cool down with hot Jalebi' },
    ],
  },
  {
    name: 'Street Breakfast Trail',
    description: 'Wake up to the best morning tiffins in the city. Crispy dosas, fluffy idlis, and authentic Irani chai to start your day right.',
    image: '/vendor-images/01-vijay-food-co.jpg', duration: '2 hours', distance: '4.2 km', difficulty: 'Easy', rating: 4.6, reviewCount: 178,
    stops: [
      { vendorKey: 'vendor-2', note: 'Masala Dosa and Punugulu' },
      { vendorKey: 'vendor-13', note: 'Tawa Idli and Karam Dosa' },
      { vendorKey: 'vendor-9', note: 'Irani Chai with Osmania Biscuits' },
    ],
  },
  {
    name: 'Late Night Food Trail',
    description: 'For the night owls. Shawarma wraps, momos, and burgers that hit different after dark. Open till 1 AM.',
    image: '/vendor-images/05-shawarma-junction.jpg', duration: '2-3 hours', distance: '5.1 km', difficulty: 'Moderate', rating: 4.5, reviewCount: 142,
    stops: [
      { vendorKey: 'vendor-5', note: 'Chicken Shawarma to start the night' },
      { vendorKey: 'vendor-4', note: 'Steamed and Fried Momos' },
      { vendorKey: 'vendor-6', note: 'Chicken Cheese Burger and Shake' },
    ],
  },
  {
    name: 'Budget Food Trail',
    description: 'Amazing food under 100 rupees. Street chaat, puffs, tiffins, and sweets that prove great taste doesn\'t need a big budget.',
    image: '/vendor-images/02-spice-trail.jpg', duration: '2 hours', distance: '3.8 km', difficulty: 'Easy', rating: 4.4, reviewCount: 98,
    stops: [
      { vendorKey: 'vendor-3', note: 'Mirchi Bajji and Pani Puri' },
      { vendorKey: 'vendor-11', note: 'Egg Puff and Cream Roll' },
      { vendorKey: 'vendor-13', note: 'Karam Dosa and Vada' },
      { vendorKey: 'vendor-8', note: 'Gulab Jamun to finish' },
    ],
  },
];

async function clearAll() {
  const database = mongoose.connection.db;
  if (!database) throw new Error('MongoDB connection did not expose a database');
  await database.dropDatabase();
}

async function seed() {
  await connectDB(env.mongodbUri);
  console.log('Clearing existing data (dropping database)...');
  await clearAll();

  // --- Core accounts ------------------------------------------------------
  console.log('Seeding admin, vendor owners, and customers...');
  const adminPass = 'admin1234';
  const vendorPass = 'vendor1234';
  const customerPass = 'customer1234';

  await User.create({
    name: 'Admin User',
    email: 'admin@streetside.local',
    passwordHash: await hashPassword(adminPass),
    role: 'admin',
  });

  const vendorOwners = new Map<string, mongoose.Types.ObjectId>();
  for (let i = 0; i < VENDORS.length; i += 1) {
    const v = VENDORS[i];
    const email = `vendor${i + 1}@streetside.local`;
    const owner = await User.create({
      name: v.name,
      email,
      passwordHash: await hashPassword(vendorPass),
      role: 'vendor',
    });
    vendorOwners.set(v.key, owner._id);
  }

  // Two named "hero" demo customers used for favorites/rewards demo data.
  const alice = await User.create({
    name: 'Alice Customer', email: 'alice@streetside.local',
    passwordHash: await hashPassword(customerPass), role: 'customer',
  });
  const bob = await User.create({
    name: 'Bob Customer', email: 'bob@streetside.local',
    passwordHash: await hashPassword(customerPass), role: 'customer',
  });
  await awardPoints(String(alice._id), 'registered', 'Registered on StreetSide');
  await awardPoints(String(bob._id), 'registered', 'Registered on StreetSide');

  // The 22 named reviewers from the curated review set, as real accounts.
  const reviewerUsers = new Map<string, mongoose.Types.ObjectId>();
  const uniqueReviewers = Array.from(new Set(CURATED_REVIEWS.map((r) => r.author)));
  for (const name of uniqueReviewers) {
    const review = CURATED_REVIEWS.find((r) => r.author === name)!;
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`;
    const user = await User.create({
      name,
      email,
      passwordHash: await hashPassword(customerPass),
      role: 'customer',
      avatar: review.avatar,
    });
    reviewerUsers.set(name, user._id);
  }

  // A pool of generic customers for the supplementary/filler reviews.
  const fillerUsers: mongoose.Types.ObjectId[] = [];
  for (const [name, slug] of FILLER_CUSTOMERS) {
    const user = await User.create({
      name,
      email: `${slug}@example.com`,
      passwordHash: await hashPassword(customerPass),
      role: 'customer',
      avatar: FILLER_AVATARS[fillerUsers.length % FILLER_AVATARS.length],
    });
    fillerUsers.push(user._id);
  }

  // --- Vendors + menu items -------------------------------------------------
  console.log('Seeding vendors and menu items...');
  const vendorIds = new Map<string, mongoose.Types.ObjectId>();
  for (const v of VENDORS) {
    const vendor = await Vendor.create({
      name: v.name,
      cuisine: v.cuisine,
      categories: v.categories,
      description: v.description,
      longDescription: v.longDescription,
      image: v.image,
      logo: v.logo,
      priceRange: v.priceRange,
      location: v.location,
      hours: v.hours,
      phone: v.phone,
      veg: v.veg,
      specialties: v.specialties,
      views: v.views,
      popularity: v.popularity,
      owner: vendorOwners.get(v.key),
      // seed vendors are demo/showcase data, not real pending
      // submissions — mark them pre-approved so the approval gate added
      // for real registrations doesn't hide the whole demo catalog.
      approvalStatus: 'approved',
    });
    vendorIds.set(v.key, vendor._id);

    const owner = await User.findById(vendorOwners.get(v.key));
    if (owner) {
      owner.vendor = vendor._id;
      await owner.save();
    }

    const items = MENU_ITEMS[v.key] ?? [];
    if (items.length) {
      await MenuItem.insertMany(items.map((item) => ({ ...item, vendor: vendor._id })));
    }
  }

  // --- Reviews ---------------------------------------------------------------
  console.log('Seeding reviews (curated + supplementary)...');
  for (const r of CURATED_REVIEWS) {
    const vendorId = vendorIds.get(r.vendorKey);
    const userId = reviewerUsers.get(r.author);
    if (!vendorId || !userId) continue;
    const doc = new Review({ vendor: vendorId, user: userId, rating: r.rating, comment: r.comment });
    await doc.save();
    await Review.updateOne({ _id: doc._id }, { createdAt: new Date(now() - r.daysAgo * DAY) });
  }

  // Supplementary reviews: a modest, roughly-popularity-scaled number per
  // vendor so browsing doesn't feel empty, without pretending to have
  // thousands of literal review documents.
  let fillerCursor = 0;
  for (const v of VENDORS) {
    const vendorId = vendorIds.get(v.key)!;
    const alreadyCurated = CURATED_REVIEWS.filter((r) => r.vendorKey === v.key).length;
    const targetTotal = Math.min(30, Math.max(4, Math.round(v.popularity / 4)));
    const toGenerate = Math.max(0, targetTotal - alreadyCurated);
    const usedUsersForVendor = new Set(
      CURATED_REVIEWS.filter((r) => r.vendorKey === v.key).map((r) => String(reviewerUsers.get(r.author))),
    );

    for (let i = 0; i < toGenerate; i += 1) {
      // Walk the filler pool round-robin, skipping anyone who has already
      // reviewed this vendor (the schema enforces one review per user per
      // vendor, same as production).
      let attempts = 0;
      let candidate: mongoose.Types.ObjectId | undefined;
      while (attempts < fillerUsers.length) {
        const c = fillerUsers[fillerCursor % fillerUsers.length];
        fillerCursor += 1;
        attempts += 1;
        if (!usedUsersForVendor.has(String(c))) {
          candidate = c;
          break;
        }
      }
      if (!candidate) break; // ran out of unique reviewers for this vendor

      usedUsersForVendor.add(String(candidate));
      const specialty = v.specialties[i % v.specialties.length];
      const template = FILLER_TEMPLATES[(i + v.popularity) % FILLER_TEMPLATES.length];
      // Ratings cluster around the vendor's original character rating,
      // rounded to a whole star with a little natural variance.
      const baseRating = Math.round(3.8 + (v.popularity / 100) * 1.2);
      const rating = Math.min(5, Math.max(3, baseRating + (i % 3 === 0 ? -1 : 0)));

      const doc = new Review({ vendor: vendorId, user: candidate, rating, comment: template(specialty) });
      await doc.save();
      await Review.updateOne({ _id: doc._id }, { createdAt: new Date(now() - (5 + i * 3) * DAY) });
    }

    await recomputeVendorRating(String(vendorId));
  }

  // --- Favorites (also drives the "explorer/legend" badges for demo users) --
  console.log('Seeding favorites...');
  const aliceFavorites = ['vendor-1', 'vendor-2', 'vendor-5'];
  const bobFavorites = ['vendor-6', 'vendor-12'];
  for (const key of aliceFavorites) {
    await Favorite.create({ user: alice._id, vendor: vendorIds.get(key) });
    await awardPoints(String(alice._id), 'added_favorite', `Added ${VENDORS.find((v) => v.key === key)?.name} to favorites`);
  }
  for (const key of bobFavorites) {
    await Favorite.create({ user: bob._id, vendor: vendorIds.get(key) });
    await awardPoints(String(bob._id), 'added_favorite', `Added ${VENDORS.find((v) => v.key === key)?.name} to favorites`);
  }

  // --- Offers ------------------------------------------------------------
  console.log('Seeding offers...');
  for (const o of OFFERS) {
    const vendorId = vendorIds.get(o.vendorKey);
    if (!vendorId) continue;
    await Offer.create({
      vendor: vendorId,
      title: o.title,
      description: o.description,
      discount: o.discount,
      code: o.code,
      expiry: new Date(now() + o.expiresInDays * DAY),
      conditions: o.conditions,
      color: o.color,
    });
  }

  // --- Events --------------------------------------------------------------
  console.log('Seeding events...');
  for (const e of EVENTS) {
    const vendorObjectIds = e.vendorKeys.map((k) => vendorIds.get(k)).filter(Boolean);
    await Event.create({
      name: e.name,
      description: e.description,
      longDescription: e.longDescription,
      image: e.image,
      date: new Date(now() + e.daysFromNow * DAY),
      time: e.time,
      location: e.location,
      area: e.area,
      vendors: vendorObjectIds,
      featured: e.featured,
    });
  }

  // --- Food trails -----------------------------------------------------------
  console.log('Seeding food trails...');
  for (const t of TRAILS) {
    await FoodTrail.create({
      name: t.name,
      description: t.description,
      image: t.image,
      duration: t.duration,
      distance: t.distance,
      difficulty: t.difficulty,
      rating: t.rating,
      reviewCount: t.reviewCount,
      stops: t.stops.map((s, idx) => ({ order: idx + 1, vendor: vendorIds.get(s.vendorKey), note: s.note })),
    });
  }

  // --- A few realistic admin reports, referencing real data -----------------
  console.log('Seeding admin reports...');
  const sampleReview = await Review.findOne({ vendor: vendorIds.get('vendor-1') });
  const reporterA = reviewerUsers.get('Lakshmi Rao') ?? alice._id;
  const reporterB = reviewerUsers.get('Krishna Murthy') ?? bob._id;
  if (sampleReview) {
    await Report.create({ type: 'review', targetId: sampleReview._id, reason: 'Inappropriate language', status: 'pending', reporter: reporterA });
  }
  await Report.create({ type: 'vendor', targetId: vendorIds.get('vendor-11'), reason: 'Incorrect location info', status: 'pending', reporter: reporterB });
  await Report.create({ type: 'vendor', targetId: vendorIds.get('vendor-14'), reason: 'Outdated menu', status: 'dismissed', reporter: reporterA });

  console.log('\nDEVELOPMENT ONLY CREDENTIALS:');
  console.log('Admin:                admin@streetside.local /', adminPass);
  console.log('Customer (demo):      alice@streetside.local /', customerPass, '(and bob@streetside.local)');
  console.log('Vendor owners:        vendor1@streetside.local .. vendor20@streetside.local /', vendorPass);
  console.log('  (vendor1 = Vijayawada Spice Hub, vendor2 = Mangalagiri Dosa Corner, ... in the order');
  console.log('   listed in backend/src/utils/seed.ts VENDORS array)');
  console.log('All other reviewer/filler accounts use the password:', customerPass);

  await disconnectDB();
  console.log('Seeding complete.');
}

// Exported for the validation harness (scripts/validate-seed.ts) so the
// data itself can be sanity-checked without needing a live MongoDB.
export { VENDORS, MENU_ITEMS, CURATED_REVIEWS, OFFERS, EVENTS, TRAILS, seed };

// Only run automatically when executed directly (`npm run seed`), not when
// imported for validation/testing.
if (require.main === module) {
  seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
