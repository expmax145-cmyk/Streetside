import { Media, ALLOWED_MIME_TYPES, type IMedia } from '../models/Media.model';
import { ApiError } from '../utils/ApiError';

const MAX_MEDIA_BYTES = 2 * 1024 * 1024; // 2 MB — generous ceiling above the frontend's 350 KB compression target

const DATA_URI_PATTERN = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/;

/**
 * Decodes a data: URI (produced by frontend/src/lib/imageUpload.ts) and
 * stores the raw bytes as a Media document. Rejects anything that isn't
 * an already-base64-encoded image of an allowed type/size — this is the
 * same validation the field-level allowlist used to do inline, just
 * centralized here now that images have their own endpoint.
 */
export async function storeImageFromDataUri(dataUri: string, uploaderId: string): Promise<IMedia> {
  const match = DATA_URI_PATTERN.exec(dataUri);
  if (!match) {
    throw ApiError.badRequest('Expected a base64 image data URI (PNG, JPEG, WebP, or GIF)');
  }

  const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw ApiError.badRequest('Unsupported image type');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_MEDIA_BYTES) {
    throw ApiError.badRequest('Image is too large (max 2 MB after decoding)');
  }
  if (buffer.length === 0) {
    throw ApiError.badRequest('Empty image data');
  }

  return Media.create({ data: buffer, mimeType, uploader: uploaderId, sizeBytes: buffer.length });
}

export async function getMediaById(id: string): Promise<IMedia> {
  const media = await Media.findById(id);
  if (!media) {
    throw ApiError.notFound('Image not found');
  }
  return media;
}
