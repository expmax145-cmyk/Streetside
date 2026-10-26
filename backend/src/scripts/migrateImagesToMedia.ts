/**
 * one-time migration — finds any Vendor/MenuItem/User document
 * still storing an inline `data:image/...;base64,...` string (from
 * before the Media collection existed) and moves those bytes into a
 * Media document, replacing the field with the resulting `/api/media/:id`
 * URL. Safe to run multiple times: documents that already use a media
 * URL (or a plain https:// URL) are left untouched.
 *
 * Usage:
 *   cd backend
 *   npx ts-node src/scripts/migrateImagesToMedia.ts
 *
 * Requires MONGODB_URI in the environment (loaded from .env the same
 * way the server does).
 *
 * This is offline admin tooling, not part of the request-handling code
 * path — it deliberately uses loose typing to sidestep fighting
 * Mongoose's generic Document types across three unrelated models,
 * rather than force a shared interface those models were never
 * designed to share.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Vendor } from '../models/Vendor.model';
import { MenuItem } from '../models/MenuItem.model';
import { User } from '../models/User.model';
import { Media, ALLOWED_MIME_TYPES } from '../models/Media.model';

const DATA_URI_PATTERN = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/;

async function migrateField(
  Model: mongoose.Model<any>,
  field: string,
  resolveUploader: (doc: any) => Promise<mongoose.Types.ObjectId | null>,
): Promise<{ scanned: number; migrated: number; skipped: number }> {
  const docs = await Model.find({ [field]: { $regex: '^data:image/' } });
  let migrated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const value = String(doc[field] ?? '');
    const match = DATA_URI_PATTERN.exec(value);
    if (!match) { skipped += 1; continue; }

    const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      console.warn(`  skip ${doc._id}: unsupported mime type ${mimeType}`);
      skipped += 1;
      continue;
    }

    const uploaderId = await resolveUploader(doc);
    if (!uploaderId) {
      console.warn(`  skip ${doc._id}: could not resolve an uploader to attribute this image to`);
      skipped += 1;
      continue;
    }

    const buffer = Buffer.from(match[2], 'base64');
    const media = await Media.create({
      data: buffer,
      mimeType,
      uploader: uploaderId,
      sizeBytes: buffer.length,
    });

    doc[field] = `/api/media/${media._id}`;
    await doc.save();
    migrated += 1;
  }

  return { scanned: docs.length, migrated, skipped };
}

async function main() {
  await connectDB();
  console.log('Starting image -> Media migration...\n');

  console.log('Vendor.image:');
  console.log(' ', await migrateField(Vendor, 'image', async (doc) => doc.owner ?? null));

  console.log('Vendor.logo:');
  console.log(' ', await migrateField(Vendor, 'logo', async (doc) => doc.owner ?? null));

  console.log('MenuItem.image:');
  // MenuItem has no owner of its own -- attribute the upload to its
  // parent vendor's owner (a lookup per document, since this migration
  // only ever runs once and correctness matters more than speed here).
  console.log(' ', await migrateField(MenuItem, 'image', async (doc) => {
    const vendor = await Vendor.findById(doc.vendor).select('owner');
    return vendor?.owner ?? null;
  }));

  console.log('User.avatar:');
  console.log(' ', await migrateField(User, 'avatar', async (doc) => doc._id));

  console.log('\nDone.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
