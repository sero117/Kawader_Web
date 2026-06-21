import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { LanguageService } from './language.service';

/**
 * Tracks "last visited" timestamps client-side, scoped to the logged-in
 * phone number. There is no backend support for this (no lastLogin field on
 * accounts, no per-branch visit history), so this only reflects activity
 * from this specific browser.
 */
@Injectable({ providedIn: 'root' })
export class VisitTrackingService {
  private readonly authService = inject(AuthService);
  private readonly lang        = inject(LanguageService);

  private readonly ACCOUNT_VISITS_KEY = 'kawader_account_visits';
  private readonly BRANCH_VISITS_KEY  = 'kawader_branch_visits';

  /** Call once per dashboard load. Returns the previous visit time (before this one overwrites it), or null on a first-ever visit. */
  recordAccountVisit(): Date | null {
    const phone = this.authService.getLoginPhone();
    if (!phone) return null;
    const map = this.readMap(this.ACCOUNT_VISITS_KEY);
    const prev = map[phone] ? new Date(map[phone]) : null;
    map[phone] = new Date().toISOString();
    localStorage.setItem(this.ACCOUNT_VISITS_KEY, JSON.stringify(map));
    return prev;
  }

  getLastBranchVisit(branchId: number): Date | null {
    const key = this.branchKey(branchId);
    if (!key) return null;
    const v = this.readMap(this.BRANCH_VISITS_KEY)[key];
    return v ? new Date(v) : null;
  }

  recordBranchVisit(branchId: number): void {
    const key = this.branchKey(branchId);
    if (!key) return;
    const map = this.readMap(this.BRANCH_VISITS_KEY);
    map[key] = new Date().toISOString();
    localStorage.setItem(this.BRANCH_VISITS_KEY, JSON.stringify(map));
  }

  formatTimeAgo(date: Date | null): string {
    if (!date) return this.lang.t('common.neverVisited');

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return this.lang.t('common.justNow');

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return this.formatUnit(minutes, 'minute', 'minutes');

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return this.formatUnit(hours, 'hour', 'hours');

    const days = Math.floor(hours / 24);
    if (days < 30) return this.formatUnit(days, 'day', 'days');

    const months = Math.floor(days / 30);
    if (months < 12) return this.formatUnit(months, 'month', 'months');

    const years = Math.floor(months / 12);
    return this.formatUnit(years, 'year', 'years');
  }

  private formatUnit(n: number, singular: string, plural: string): string {
    const unitWord = this.lang.t(`common.timeUnits.${n === 1 ? singular : plural}`);
    return this.lang.getLanguage() === 'ar'
      ? `قبل ${n} ${unitWord}`
      : `${n} ${unitWord} ago`;
  }

  private branchKey(branchId: number): string | null {
    const phone = this.authService.getLoginPhone();
    return phone ? `${phone}:${branchId}` : null;
  }

  private readMap(key: string): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(key) ?? '{}'); }
    catch { return {}; }
  }
}
