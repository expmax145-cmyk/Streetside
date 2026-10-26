/**
 * Application timezone — default Asia/Kolkata (IST, UTC+5:30).
 * Overridden by APP_TIMEZONE environment variable.
 *
 * All open-now logic must use this, not server-local time.
 * Offer expiry is normalized to end-of-day in this timezone.
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

/**
 * Returns the current date/time expressed in the app timezone.
 * Uses Intl.DateTimeFormat to get the local time components, then
 * reconstructs a Date representing that instant in UTC — so comparisons
 * with stored UTC timestamps work correctly regardless of the server OS
 * timezone.
 */
export function nowInTimezone(tz: string = APP_TIMEZONE): { h: number; m: number; dayIdx: number; date: Date } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric', minute: 'numeric', weekday: 'short',
    hour12: false,
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const h = parseInt(get('hour'), 10) % 24; // '24' can appear at midnight in some locales
  const m = parseInt(get('minute'), 10);
  const weekday = get('weekday'); // 'Sun', 'Mon', ...

  const DAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayIdx = DAY_ORDER.indexOf(weekday);

  return { h, m, dayIdx, date: now };
}

/**
 * Normalizes a date-only expiry (e.g. "2026-10-01") to the end of that
 * calendar day in the app timezone (23:59:59 IST), so an offer marked
 * "expires Oct 1" remains active all the way through 23:59:59 IST on Oct 1.
 *
 * Without this, UTC-midnight storage causes the offer to expire
 * 5h30m early for Indian users.
 */
export function endOfDayInTimezone(d: Date, tz: string = APP_TIMEZONE): Date {
  // Get the year/month/day in the target timezone
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const dateStr = `${get('year')}-${get('month')}-${get('day')}T23:59:59`;

  // Parse as a local time in the target TZ by appending the UTC offset.
  // We need the TZ offset for 23:59 on that date.
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, timeZoneName: 'shortOffset',
  });
  const offsetStr = tzFormatter.format(d).match(/GMT([+-]\d+(?::\d+)?)/)?.[1] ?? '+00:00';
  const normalized = offsetStr.includes(':') ? offsetStr : `${offsetStr}:00`;

  return new Date(`${dateStr}${normalized}`);
}
