import { signal, Signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

type FilterValue = string | number | null | undefined;
type FilterRecord = Record<string, FilterValue>;

/** Pagination keys get a fixed PascalCase URL representation (matching the
 *  backend's own query param casing) and, unlike every other filter key,
 *  are always present in the URL — never stripped at their default value —
 *  so a shared link always pins the exact page/size it was copied from. */
const PAGINATION_URL_KEYS: Record<string, string> = {
  pageNumber: 'PageNumber',
  pageSize:   'PageSize',
};

/**
 * Syncs a typed filter object with URL query params (bidirectional).
 *
 * Usage:
 *   filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
 *     search: '', pageNumber: 1, pageSize: 10
 *   });
 *
 *   filter.set({ search: '09...' });   // updates signal + URL (resets pageNumber)
 *   filter.patch({ pageNumber: 2 });   // partial update, no page reset
 *   filter.reset();                    // back to defaults
 *   filter.value()                     // read current value (Signal)
 */
export class UrlFilter<T extends FilterRecord> {
  private readonly _value: WritableSignal<T>;
  readonly value: Signal<T>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly defaults: T,
  ) {
    // Must initialize in constructor body — field initializers run before
    // constructor parameter properties are assigned (ES2022 class fields).
    this._value = signal<T>({ ...defaults });
    this.value  = this._value.asReadonly();
    this.loadFromUrl();
    this.syncUrl(); // normalize the URL immediately — PageSize/PageNumber always present, even on first load
  }

  /** Partial update — resets pageNumber to default unless explicitly included */
  set(patch: Partial<T>): void {
    const resetPage = !('pageNumber' in patch) && 'pageNumber' in this.defaults;
    this._value.update(v => ({
      ...v,
      ...patch,
      ...(resetPage ? { pageNumber: (this.defaults as FilterRecord)['pageNumber'] } : {}),
    }));
    this.syncUrl();
  }

  /** Partial update without resetting pageNumber */
  patch(partial: Partial<T>): void {
    this._value.update(v => ({ ...v, ...partial }));
    this.syncUrl();
  }

  reset(): void {
    this._value.set({ ...this.defaults });
    this.syncUrl();
  }

  /**
   * Client-side filter — reads `key` from the current filter value as a search
   * term, then returns only the items for which `matcher` returns true.
   * Call this inside a `computed()` so Angular tracks the signal dependency.
   */
  filterItems<U>(
    items: U[],
    key: keyof T,
    matcher: (item: U, term: string) => boolean,
  ): U[] {
    const term = String(this.value()[key] ?? '').trim().toLowerCase();
    if (!term) return items;
    return items.filter(item => matcher(item, term));
  }

  // ── private ──────────────────────────────────────────────────────────────────

  private loadFromUrl(): void {
    const params = this.route.snapshot.queryParams;
    const loaded: Partial<T> = {};

    for (const key of Object.keys(this.defaults) as (keyof T & string)[]) {
      // Pagination keys read the PascalCase URL key first, falling back to the
      // plain key so pre-existing/legacy links still work.
      const urlKey = PAGINATION_URL_KEYS[key];
      const raw = urlKey ? (params[urlKey] ?? params[key]) : params[key];
      if (raw === undefined) continue;
      const def = this.defaults[key];
      (loaded as FilterRecord)[key] = typeof def === 'number' ? Number(raw) : raw;
    }

    if (Object.keys(loaded).length > 0) {
      this._value.set({ ...this.defaults, ...loaded });
    }
  }

  private syncUrl(): void {
    const v = this._value();
    const queryParams: Record<string, string | null> = {};

    for (const [key, val] of Object.entries(v)) {
      const urlKey = PAGINATION_URL_KEYS[key] ?? key;
      const isEmpty = val === undefined || val === null || val === '';

      if (urlKey !== key) {
        // Migrate away from the old camelCase key if a legacy link had it.
        queryParams[key] = null;
      }

      if (key in PAGINATION_URL_KEYS) {
        // Always present, regardless of default — a shared link must pin the
        // exact page/size it was copied from.
        const def = (this.defaults as FilterRecord)[key];
        queryParams[urlKey] = String(isEmpty ? def : val);
      } else {
        const def = (this.defaults as FilterRecord)[key];
        queryParams[urlKey] = (isEmpty || val === def) ? null : String(val);
      }
    }

    this.router.navigate([], {
      relativeTo:          this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl:          true,
    });
  }
}
