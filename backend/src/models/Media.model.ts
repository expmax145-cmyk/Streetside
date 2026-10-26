import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * (Media collection, deferred item from the original fix pass).
 *
 * Previously, uploaded images (vendor photos, logos, menu items, user
 * avatars) were stored as base64 data URIs directly inside the owning
 * document. That bloats every read of that document (a review list
 * request pulled down the full avatar bytes for every reviewer) and hits
 * the 1 MB JSON body limit on anything but small images.
 *
 * This collection stores the raw bytes once, referenced everywhere else
 * by a short `/api/media/:id` URL instead.
 */
export interface IMedia extends Document {
  _id: Types.ObjectId;
  data: Buffer;
  mimeType: string;
  uploader: Types.ObjectId;
  sizeBytes: number;
  createdAt: Date;
}

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const mediaSchema = new Schema<IMedia>(
  {
    data: { type: Buffer, required: true },
    mimeType: { type: String, required: true, enum: ALLOWED_MIME_TYPES },
    uploader: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sizeBytes: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Media = model<IMedia>('Media', mediaSchema);
export { ALLOWED_MIME_TYPES };
