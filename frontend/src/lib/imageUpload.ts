/**
 * Client-side image upload helpers.
 *
 * Changes from original:
 * - PNG/WebP with alpha channel is preserved (canvas filled white for JPEG output)
 * - GIFs over 500 KB are rejected with a clear message (they cannot be compressed)
 * - Output is re-encoded at reducing quality until it fits under 350 KB
 * - Accepted types validated against explicit list
 */

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const MAX_SOURCE_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
// GIFs can't be compressed via canvas — reject large ones early
const MAX_GIF_BYTES = 500 * 1024; // 500 KB
// final output must fit in the backend's 1 MB JSON body
const MAX_OUTPUT_BYTES = 350 * 1024; // 350 KB (safety margin below 1 MB)

export class ImageUploadError extends Error {}

export function validateImageFile(file: File): void {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new ImageUploadError('Please choose a PNG, JPEG, WebP, or GIF image.');
  }
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new ImageUploadError('That image is too large (max 8 MB). Try a smaller photo.');
  }
  // GIF-specific size check (canvas can't compress animation)
  if (file.type === 'image/gif' && file.size > MAX_GIF_BYTES) {
    throw new ImageUploadError(
      'Animated GIFs must be under 500 KB. Please use a smaller GIF, or convert to PNG/JPEG.',
    );
  }
}

interface CompressOptions {
  /** Longest edge in pixels. */
  maxDimension: number;
  /** Initial JPEG/WebP quality, 0–1. */
  quality: number;
}

/**
 * Reads an image file, scales and compresses it.
 * - PNG with alpha → output as WebP (if supported) or fill white then JPEG
 * - GIF under 500 KB → pass through as-is (canvas can't animate)
 * - All others → JPEG with iterative quality reduction until ≤ 350 KB
 */
export function fileToCompressedDataUrl(file: File, options: CompressOptions): Promise<string> {
  validateImageFile(file);

  if (file.type === 'image/gif') {
    return readFileAsDataUrl(file);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const scale = Math.min(1, options.maxDimension / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new ImageUploadError('Could not process that image in this browser.');

        const hasAlpha = file.type === 'image/png' || file.type === 'image/webp';
        const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');

        if (hasAlpha && supportsWebP) {
          // preserve alpha via WebP
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/webp', options.quality);
          resolve(ensureSizeLimit(canvas, dataUrl, 'image/webp', options.quality));
        } else {
          // fill white background before JPEG encoding (no black transparency)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', options.quality);
          resolve(ensureSizeLimit(canvas, dataUrl, 'image/jpeg', options.quality));
        }
      } catch (err) {
        reject(err instanceof Error ? err : new ImageUploadError('Could not process that image.'));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new ImageUploadError('That file doesn\u2019t look like a valid image.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Iteratively reduce quality/dimension until output ≤ MAX_OUTPUT_BYTES.
 * Prevents oversized base64 blobs from hitting the 1 MB body limit.
 */
function ensureSizeLimit(
  canvas: HTMLCanvasElement,
  dataUrl: string,
  mimeType: string,
  quality: number,
): string {
  let result = dataUrl;
  let q = quality;
  let attempts = 0;

  while (result.length > MAX_OUTPUT_BYTES && attempts < 6) {
    attempts++;
    q = Math.max(0.3, q - 0.1);
    result = canvas.toDataURL(mimeType, q);
  }

  // If still too large, halve the canvas dimensions and retry once
  if (result.length > MAX_OUTPUT_BYTES) {
    const smaller = document.createElement('canvas');
    smaller.width = Math.round(canvas.width / 2);
    smaller.height = Math.round(canvas.height / 2);
    const ctx = smaller.getContext('2d');
    if (ctx) {
      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, smaller.width, smaller.height);
      }
      ctx.drawImage(canvas, 0, 0, smaller.width, smaller.height);
      result = smaller.toDataURL(mimeType, 0.6);
    }
  }

  if (result.length > MAX_OUTPUT_BYTES) {
    throw new ImageUploadError(
      'That image is too large even after compression. Please choose a smaller image.',
    );
  }

  return result;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ImageUploadError('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}
