import { Injectable, inject, signal } from '@angular/core';
import { CompanyService } from './company.service';
import {
  toCompanyTime, formatCompanyDate, formatCompanyDayMonth, formatCompanyTime,
  companyHour, companyTodayIso, isCompanyToday,
} from '../utils/company-time';

/** Holds the logged-in company-manager/HR/employee's own company utcOffset
 *  (loaded once via /Companies/status) and exposes it plus convenience
 *  formatting methods, so every page under dashboard/manager, dashboard/hr,
 *  and dashboard/employee reads dates/times in the company's own timezone
 *  instead of the viewer's browser timezone. */
@Injectable({ providedIn: 'root' })
export class CompanyTimeService {
  private readonly companyService = inject(CompanyService);

  /** Defaults to 0 (UTC) until loaded — better than crashing/guessing. */
  readonly utcOffset = signal(0);
  private loaded = false;

  /** Safe to call from every layout that might land first (manager, HR,
   *  employee) — only fetches once no matter how many times it's called. Skip
   *  this if the caller already fetches /Companies/status itself (e.g. for
   *  companyName/logo) — call setOffset() with that same response instead, to
   *  avoid firing the request twice. */
  ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.companyService.getStatus().subscribe({
      next: (res: any) => {
        const offset = res?.data?.utcOffset ?? res?.utcOffset;
        if (typeof offset === 'number') this.utcOffset.set(offset);
      },
      error: () => { /* keep the UTC default */ },
    });
  }

  /** For callers that already fetched /Companies/status themselves — feed the
   *  offset in directly instead of triggering a second identical request. */
  setOffset(offset: number | null | undefined): void {
    this.loaded = true;
    if (typeof offset === 'number') this.utcOffset.set(offset);
  }

  formatDate(iso?: string | null, locale?: string, options?: Intl.DateTimeFormatOptions): string {
    return formatCompanyDate(iso, this.utcOffset(), locale, options);
  }
  formatDayMonth(iso?: string | null, locale?: string): string { return formatCompanyDayMonth(iso, this.utcOffset(), locale); }
  formatTime(iso?: string | null, locale?: string, options?: Intl.DateTimeFormatOptions): string {
    return formatCompanyTime(iso, this.utcOffset(), locale, options);
  }
  hour(iso?: string | null): number { return companyHour(iso, this.utcOffset()); }
  todayIso(): string { return companyTodayIso(this.utcOffset()); }
  isToday(iso?: string | null): boolean { return isCompanyToday(iso, this.utcOffset()); }
  /** Defaults to *now* when no iso is given — a Date whose UTC getters/UTC
   *  timezone formatting read as the company's current wall-clock time. */
  toCompanyTime(iso?: string | null): Date {
    return toCompanyTime(iso ?? new Date().toISOString(), this.utcOffset())!;
  }
}
