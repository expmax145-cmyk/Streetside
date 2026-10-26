import { VENDORS, MENU_ITEMS, CURATED_REVIEWS, OFFERS, EVENTS, TRAILS } from './seed';
import { CUISINE_TYPES, FOOD_CATEGORIES, VENDOR_VEG_STATUSES, MENU_ITEM_VEG_STATUSES } from '../types/enums';

let errors = 0;
const fail = (msg: string) => { console.error('FAIL:', msg); errors += 1; };

const vendorKeys = new Set(VENDORS.map((v) => v.key));
if (vendorKeys.size !== VENDORS.length) fail('duplicate vendor keys');
if (vendorKeys.size !== 20) fail(`expected 20 vendors, got ${vendorKeys.size}`);

for (const v of VENDORS) {
  if (!(CUISINE_TYPES as readonly string[]).includes(v.cuisine)) fail(`${v.key}: invalid cuisine "${v.cuisine}"`);
  for (const c of v.categories) {
    if (!(FOOD_CATEGORIES as readonly string[]).includes(c)) fail(`${v.key}: invalid category "${c}"`);
  }
  if (!(VENDOR_VEG_STATUSES as readonly string[]).includes(v.veg)) fail(`${v.key}: invalid veg status "${v.veg}"`);
  if (v.priceRange[0] < 0 || v.priceRange[1] < v.priceRange[0]) fail(`${v.key}: invalid priceRange`);
  if (v.location.lat < -90 || v.location.lat > 90 || v.location.lng < -180 || v.location.lng > 180) {
    fail(`${v.key}: invalid lat/lng`);
  }
}

for (const [key, items] of Object.entries(MENU_ITEMS)) {
  if (!vendorKeys.has(key)) fail(`menu items reference unknown vendor key "${key}"`);
  for (const item of items) {
    if (!(FOOD_CATEGORIES as readonly string[]).includes(item.category)) {
      fail(`${key}/${item.name}: invalid menu category "${item.category}"`);
    }
    if (!(MENU_ITEM_VEG_STATUSES as readonly string[]).includes(item.veg)) {
      fail(`${key}/${item.name}: invalid menu veg "${item.veg}"`);
    }
    if (item.price <= 0) fail(`${key}/${item.name}: non-positive price`);
  }
}
for (const key of vendorKeys) {
  if (!MENU_ITEMS[key] || MENU_ITEMS[key].length === 0) fail(`${key}: has no menu items`);
}

const reviewPairs = new Set<string>();
for (const r of CURATED_REVIEWS) {
  if (!vendorKeys.has(r.vendorKey)) fail(`review references unknown vendor key "${r.vendorKey}"`);
  const pairKey = `${r.vendorKey}::${r.author}`;
  if (reviewPairs.has(pairKey)) fail(`duplicate curated review for ${r.author} on ${r.vendorKey}`);
  reviewPairs.add(pairKey);
  if (r.rating < 1 || r.rating > 5) fail(`review by ${r.author}: invalid rating ${r.rating}`);
}

for (const o of OFFERS) {
  if (!vendorKeys.has(o.vendorKey)) fail(`offer "${o.code}" references unknown vendor key "${o.vendorKey}"`);
  if (o.expiresInDays <= 0) fail(`offer "${o.code}": non-positive expiresInDays`);
}

for (const e of EVENTS) {
  for (const vk of e.vendorKeys) {
    if (!vendorKeys.has(vk)) fail(`event "${e.name}" references unknown vendor key "${vk}"`);
  }
  if (e.daysFromNow <= 0) fail(`event "${e.name}": daysFromNow should be in the future`);
}

for (const t of TRAILS) {
  if (t.stops.length === 0) fail(`trail "${t.name}" has no stops`);
  for (const s of t.stops) {
    if (!vendorKeys.has(s.vendorKey)) fail(`trail "${t.name}" references unknown vendor key "${s.vendorKey}"`);
  }
}

// Every menu item's `image` path should exist under frontend/public.
import fs from 'fs';
import path from 'path';
const publicDir = path.resolve(__dirname, '../../../frontend/public');
const checkImage = (imgPath: string, ctx: string) => {
  const full = path.join(publicDir, imgPath);
  if (!fs.existsSync(full)) fail(`${ctx}: image not found on disk: ${imgPath}`);
};
for (const v of VENDORS) {
  checkImage(v.image, `${v.key} image`);
  checkImage(v.logo, `${v.key} logo`);
}
for (const [key, items] of Object.entries(MENU_ITEMS)) {
  for (const item of items) checkImage(item.image, `${key}/${item.name}`);
}
for (const e of EVENTS) checkImage(e.image, `event ${e.name}`);
for (const t of TRAILS) checkImage(t.image, `trail ${t.name}`);

if (errors > 0) {
  console.error(`\n${errors} validation error(s) found.`);
  process.exit(1);
} else {
  console.log('All seed data validated successfully:');
  console.log(`  ${VENDORS.length} vendors`);
  console.log(`  ${Object.values(MENU_ITEMS).reduce((n, arr) => n + arr.length, 0)} menu items`);
  console.log(`  ${CURATED_REVIEWS.length} curated reviews`);
  console.log(`  ${OFFERS.length} offers`);
  console.log(`  ${EVENTS.length} events`);
  console.log(`  ${TRAILS.length} food trails`);
}
