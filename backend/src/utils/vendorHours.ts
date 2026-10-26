/**
 * Timezone-aware open-now logic.
 *
 * MUST mirror frontend/src/lib/format.ts#isVendorOpenNow exactly.
 * Any change here must be applied there too.
 *
 * Uses Intl.DateTimeFormat to get the current time in APP_TIMEZONE
 * (default: Asia/Kolkata / IST) instead of the server OS timezone —
 * so a vendor open 10:00–22:00 IST correctly shows "open" at 3 PM IST
 * even when the server runs in UTC.
 *
 * Also fixes overnight handling: a Mon–Fri 18:00–02:00 stall correctly
 * shows "open" at Saturday 01:00 IST by checking whether the close time
 * belongs to the PREVIOUS day's schedule.
 */
import { APP_TIMEZONE, nowInTimezone } from './timezone';

export { APP_TIMEZONE };

const DAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isDayInRange(dayIdx: number, startIdx: number, endIdx: number): boolean {
  if (startIdx === -1 || endIdx === -1) return true; // unparseable → assume always open
  if (startIdx <= endIdx) {
    return dayIdx >= startIdx && dayIdx <= endIdx;
  }
  // Wrapping range e.g. Fri–Mon
  return dayIdx >= startIdx || dayIdx <= endIdx;
}

export function isVendorOpenNow(
  hours: { open: string; close: string; days: string },
  now: Date = new Date(),
  tz: string = APP_TIMEZONE,
): boolean {
  const [startLabel, endLabel] = hours.days.split('-').map((s) => s.trim());
  const startIdx = DAY_ORDER.indexOf(startLabel);
  const endIdx = DAY_ORDER.indexOf(endLabel);

  const { h, m, dayIdx } = nowInTimezone(tz);
  const nowMinutes = h * 60 + m;

  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  // 24-hour operation: open === close means always open
  if (openMinutes === closeMinutes) return isDayInRange(dayIdx, startIdx, endIdx);

  const isOvernight = closeMinutes <= openMinutes;

  if (!isOvernight) {
    // Normal schedule: just check today's day range and time range
    return isDayInRange(dayIdx, startIdx, endIdx) &&
           nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  }

  // Overnight schedule (e.g. 18:00–02:00)
  // The close time (02:00) belongs to the NEXT calendar day, so:
  // - If now >= open: today must be in the day range
  // - If now < close: YESTERDAY must be in the day range
  if (nowMinutes >= openMinutes) {
    return isDayInRange(dayIdx, startIdx, endIdx);
  }
  if (nowMinutes < closeMinutes) {
    const yesterdayIdx = (dayIdx + 6) % 7; // wrap Sunday → Saturday
    return isDayInRange(yesterdayIdx, startIdx, endIdx);
  }
  return false;
}
