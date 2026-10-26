export function formatPrice(price: number): string {
  return `\u20B9${price}`;
}

export function formatPriceRange(range: [number, number]): string {
  return `\u20B9${range[0]}\u2013\u20B9${range[1]}`;
}

export function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

export function formatReviewCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export function debounce<T extends (...args: never[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * App timezone — must match backend APP_TIMEZONE env var.
 * Default: Asia/Kolkata (IST, UTC+5:30).
 */
export const APP_TIMEZONE =
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_APP_TIMEZONE as string | undefined)) ||
  'Asia/Kolkata';

const DAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Get current time components in the app timezone using
 * Intl.DateTimeFormat — so "open now" is evaluated in IST, not in the
 * user's local browser timezone, which could differ on an international user.
 */
function nowInTimezone(tz: string = APP_TIMEZONE): { h: number; m: number; dayIdx: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const h = parseInt(get('hour'), 10) % 24;
  const m = parseInt(get('minute'), 10);
  const weekday = get('weekday');
  const dayIdx = DAY_ORDER.indexOf(weekday);

  return { h, m, dayIdx };
}

function isDayInRange(dayIdx: number, startIdx: number, endIdx: number): boolean {
  if (startIdx === -1 || endIdx === -1) return true;
  if (startIdx <= endIdx) {
    return dayIdx >= startIdx && dayIdx <= endIdx;
  }
  return dayIdx >= startIdx || dayIdx <= endIdx;
}

/**
 * Computes whether a vendor is open right now in APP_TIMEZONE (IST).
 * Handles overnight schedules (close <= open) and day-range wrap (e.g. Fri–Mon).
 *
 * MUST mirror backend/src/utils/vendorHours.ts exactly.
 */
export function isVendorOpenNow(
  hours: { open: string; close: string; days: string },
  
): boolean {
  const [startLabel, endLabel] = hours.days.split('-').map((s) => s.trim());
  const startIdx = DAY_ORDER.indexOf(startLabel);
  const endIdx = DAY_ORDER.indexOf(endLabel);

  const { h, m, dayIdx } = nowInTimezone();
  const nowMinutes = h * 60 + m;

  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  // 24-hour operation
  if (openMinutes === closeMinutes) return isDayInRange(dayIdx, startIdx, endIdx);

  const isOvernight = closeMinutes <= openMinutes;

  if (!isOvernight) {
    return (
      isDayInRange(dayIdx, startIdx, endIdx) &&
      nowMinutes >= openMinutes &&
      nowMinutes < closeMinutes
    );
  }

  // Overnight — close time belongs to next calendar day
  if (nowMinutes >= openMinutes) {
    return isDayInRange(dayIdx, startIdx, endIdx);
  }
  if (nowMinutes < closeMinutes) {
    const yesterdayIdx = (dayIdx + 6) % 7;
    return isDayInRange(yesterdayIdx, startIdx, endIdx);
  }
  return false;
}

/**
 * Same as isVendorOpenNow but also respects vendor.manualClosed override.
 */
export function vendorIsOpenNow(
  vendor: { hours: { open: string; close: string; days: string }; manualClosed?: boolean },
): boolean {
  if (vendor.manualClosed) return false;
  return isVendorOpenNow(vendor.hours);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  } catch {
    return false;
  }
}
