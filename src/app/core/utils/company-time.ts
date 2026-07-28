/** Every timestamp from the API is UTC. Rendering it with toLocaleDateString()/
 *  toLocaleTimeString() shows it in the VIEWER's own browser timezone, which is
 *  wrong here — a Libyan company's attendance/payroll/holiday dates need to be
 *  read in *that company's* configured timezone (its utcOffset, in hours),
 *  regardless of where the person looking at the screen happens to be.
 *
 *  The trick: shift the real UTC instant by the offset, then read it back with
 *  the UTC getters (getUTCHours, getUTCDate, ...) instead of the local getters.
 *  Reading UTC getters off a shifted instant deliberately bypasses whatever
 *  timezone the browser itself is in. */

/** Returns a Date whose UTC getters/UTC-timezone formatting read as the
 *  wall-clock time in the company's timezone. Do not call local getters
 *  (getHours, getDate, toLocaleDateString without timeZone:'UTC', ...) on the
 *  result — always use the getUTC* equivalents, or pass `timeZone: 'UTC'`
 *  when formatting, so the browser's own timezone never gets a second say. */
export function toCompanyTime(iso: string | null | undefined, utcOffsetHours: number): Date | null {
  if (!iso) return null;
  const utcMs = new Date(iso).getTime();
  if (Number.isNaN(utcMs)) return null;
  return new Date(utcMs + utcOffsetHours * 3600000);
}

const DEFAULT_DATE_OPTS: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };

/** Locale-aware date formatting in the company's timezone — same `locale`/
 *  `options` you'd pass to toLocaleDateString, just timezone-correct. Defaults
 *  match this app's existing "28 Jul 2026" (en-GB) convention. */
export function formatCompanyDate(
  iso: string | null | undefined, utcOffsetHours: number,
  locale = 'en-GB', options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTS,
): string {
  const d = toCompanyTime(iso, utcOffsetHours);
  if (!d) return '—';
  return d.toLocaleDateString(locale, { ...options, timeZone: 'UTC' });
}

/** "28 Jul" — no year, for yearly-recurring holidays and similar. */
export function formatCompanyDayMonth(iso: string | null | undefined, utcOffsetHours: number, locale = 'en-GB'): string {
  return formatCompanyDate(iso, utcOffsetHours, locale, { day: '2-digit', month: 'short' });
}

/** Locale-aware time formatting in the company's timezone. Defaults to this
 *  app's existing "14:05" (ar, 24h) convention. */
export function formatCompanyTime(
  iso: string | null | undefined, utcOffsetHours: number,
  locale = 'ar', options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
): string {
  const d = toCompanyTime(iso, utcOffsetHours);
  if (!d) return '—';
  return d.toLocaleTimeString(locale, { ...options, timeZone: 'UTC' });
}

/** Hour of day (0-23) in the company's timezone — e.g. for "is this check-in late" checks. */
export function companyHour(iso: string | null | undefined, utcOffsetHours: number): number {
  const d = toCompanyTime(iso, utcOffsetHours);
  return d ? d.getUTCHours() : -1;
}

/** "YYYY-MM-DD" for *right now*, as it is in the company's timezone — the
 *  correct replacement for `new Date().toISOString().slice(0, 10)`, which
 *  gives the viewer's UTC date and can be off by a day near midnight. */
export function companyTodayIso(utcOffsetHours: number): string {
  const d = toCompanyTime(new Date().toISOString(), utcOffsetHours)!;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** True when `iso` falls on the company's "today". */
export function isCompanyToday(iso: string | null | undefined, utcOffsetHours: number): boolean {
  const d = toCompanyTime(iso, utcOffsetHours);
  if (!d) return false;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}` === companyTodayIso(utcOffsetHours);
}
