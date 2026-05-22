import { signal, Signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

type FilterValue = string | number | null | undefined;
type FilterRecord = Record<string, FilterValue>;

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

  // ── private ──────────────────────────────────────────────────────────────────

  private loadFromUrl(): void {
    const params = this.route.snapshot.queryParams;
    const loaded: Partial<T> = {};

    for (const key of Object.keys(this.defaults) as (keyof T & string)[]) {
      const raw = params[key];
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
      const def = (this.defaults as FilterRecord)[key];
      queryParams[key] = (val === undefined || val === null || val === '' || val === def)
        ? null
        : String(val);
    }

    this.router.navigate([], {
      relativeTo:          this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl:          true,
    });
  }
}
