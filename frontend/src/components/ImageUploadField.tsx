import { useCallback, useId, useRef, useState, type DragEvent } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { fileToCompressedDataUrl, ImageUploadError } from '@/lib/imageUpload';
import { uploadImage } from '@/services/mediaService';

interface ImageUploadFieldProps {
  /** Omit to render a bare upload control with no visible label (e.g. inline next to a name field). */
  label?: string;
  /** Current image — a URL or a data: URI — or empty/undefined for "no image set". */
  value: string | undefined;
  onChange: (dataUrl: string) => void;
  onError?: (message: string) => void;
  /** Longest edge the compressed output is scaled to fit within. */
  maxDimension?: number;
  quality?: number;
  /** `circle` for avatars/logos, `banner` for wide cover images. */
  shape?: 'circle' | 'banner';
  hint?: string;
}

/**
 * Drag-and-drop (or click-to-browse) image upload with an inline preview.
 * Compresses the picked file client-side (see lib/imageUpload.ts) and
 * hands the caller a ready-to-store base64 data URL — the caller decides
 * when to actually persist it (e.g. on the form's Save button), this
 * component only handles picking/previewing/validating.
 */
export default function ImageUploadField({
  label,
  value,
  onChange,
  onError,
  maxDimension = 800,
  quality = 0.82,
  shape = 'banner',
  hint,
}: ImageUploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // shown immediately after compression, before the network
  // upload finishes — once `onChange` fires with the real /api/media
  // URL and the parent re-renders with a new `value`, this is cleared
  // and the real (much smaller) URL takes over as the image src.
  const [optimisticPreview, setOptimisticPreview] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File | undefined | null) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, { maxDimension, quality });
      setOptimisticPreview(dataUrl);
      // upload to the Media collection and hand the caller a
      // short URL, instead of the old behavior of handing back the full
      // base64 data URL to be embedded directly in the vendor/menu/user
      // document (which bloated every read of that document).
      const mediaUrl = await uploadImage(dataUrl);
      onChange(mediaUrl);
    } catch (err) {
      setOptimisticPreview(null);
      const message = err instanceof ImageUploadError
        ? err.message
        : err instanceof Error && err.message === 'Upload did not return a URL'
          ? 'Upload failed. Please try again.'
          : 'Could not upload that image. Please try again.';
      onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  }, [maxDimension, quality, onChange, onError]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }, [handleFile]);

  const isCircle = shape === 'circle';

  return (
    <div>
      {label && <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-charcoal-700">{label}</label>}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        className={[
          'group relative cursor-pointer overflow-hidden border-2 border-dashed transition-colors',
          isCircle ? 'h-28 w-28 rounded-full' : 'h-36 w-full rounded-2xl',
          isDragging ? 'border-brand-500 bg-brand-50' : 'border-charcoal-200 bg-charcoal-50 hover:border-brand-400',
        ].join(' ')}
      >
        {(optimisticPreview || value) ? (
          <img src={optimisticPreview || value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 text-center text-charcoal-400">
            <ImagePlus size={22} />
            <span className="text-xs font-medium">Drop image or click to browse</span>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-charcoal-900/50">
            <Loader2 size={22} className="animate-spin text-white" />
          </div>
        )}

        {!isProcessing && value && (
          <div className="absolute inset-0 flex items-center justify-center bg-charcoal-900/0 opacity-0 transition-opacity group-hover:bg-charcoal-900/40 group-hover:opacity-100">
            <span className="text-xs font-semibold text-white">Change image</span>
          </div>
        )}

        {value && !isProcessing && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            aria-label={label ? `Remove ${label.toLowerCase()}` : 'Remove image'}
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-charcoal-900/70 text-white hover:bg-charcoal-900"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {hint && <p className="mt-1.5 text-xs text-charcoal-400">{hint}</p>}
    </div>
  );
}
