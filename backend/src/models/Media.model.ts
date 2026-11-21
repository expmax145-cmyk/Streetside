import { defineModel, type BaseDoc } from '../db/model';

/**
 * Uploaded images (vendor photos, logos, menu items, avatars) are stored once
 * here and referenced everywhere else by a short `/api/media/:id` URL.
 */
export interface IMedia extends BaseDoc {
  data: Buffer;
  mimeType: string;
  uploader: any;
  sizeBytes: number;
}

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export const Media = defineModel<IMedia>({
  name: 'Media',
  table: 'media',
  timestamps: { createdAt: true, updatedAt: false },
  fields: {
    data: { type: 'bytes', required: true },
    mimeType: { type: 'string', required: true, enum: ALLOWED_MIME_TYPES },
    uploader: { type: 'id', column: 'uploader_id', ref: 'User', required: true },
    sizeBytes: { type: 'number', required: true },
  },
});
export { ALLOWED_MIME_TYPES };
