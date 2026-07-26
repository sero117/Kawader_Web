import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { CurrencyService } from '../../../core/services/currency.service';
import {
  Currency, CreateCurrencyRequest, UpdateCurrencyRequest, CurrencyRate,
} from '../../../core/models/currency.models';

@Component({
  selector: 'app-currencies',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="page-content">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ 'admin.currencies.title' | translate }}</h1>
          <p class="page-subtitle">{{ 'admin.currencies.subtitle' | translate }}</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:16px;height:16px">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          {{ 'admin.currencies.addCurrency' | translate }}
        </button>
      </div>

      <!-- Search -->
      <div class="admin-card" style="margin-bottom:16px">
        <div class="p-5 pb-4">
          <div class="flex flex-wrap gap-3">
            <div class="relative" style="max-width:220px;flex:1">
              <input type="text" [placeholder]="'admin.currencies.searchCode' | translate"
                class="w-full px-4 py-2.5 rounded-xl text-sm"
                style="background: var(--bg-subtle-sm); border: 1px solid var(--border); color: var(--text-muted); outline: none;"
                [value]="filter.value().code"
                (input)="onCodeSearch($any($event.target).value)" />
            </div>
            <div class="relative" style="max-width:280px;flex:1">
              <input type="text" [placeholder]="'admin.currencies.searchName' | translate"
                class="w-full px-4 py-2.5 rounded-xl text-sm"
                style="background: var(--bg-subtle-sm); border: 1px solid var(--border); color: var(--text-muted); outline: none;"
                [value]="filter.value().name"
                (input)="onNameSearch($any($event.target).value)" />
            </div>
          </div>
        </div>
      </div>

      @if (listError()) {
        <div class="error-banner">{{ listError() }}</div>
      }

      @if (loading()) {
        <div class="loading-state"><div class="spinner"></div></div>
      } @else if (currencies().length === 0) {
        <div class="empty-state">
          <p class="empty-state-title">{{ 'admin.currencies.empty' | translate }}</p>
        </div>
      } @else {
        <div class="admin-card">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>{{ 'admin.currencies.colArabicName' | translate }}</th>
                  <th>{{ 'admin.currencies.colEnglishName' | translate }}</th>
                  <th>{{ 'admin.currencies.colCode' | translate }}</th>
                  <th>{{ 'admin.currencies.colSymbol' | translate }}</th>
                  <th>{{ 'admin.currencies.colRate' | translate }}</th>
                  <th style="text-align: right;">{{ 'admin.currencies.colActions' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (c of currencies(); track c.id) {
                  <tr>
                    <td style="color: var(--text-base); font-weight: 600;">{{ c.arabicName }}</td>
                    <td style="color: var(--text-faint);">{{ c.englishName }}</td>
                    <td>
                      <span class="font-mono" style="color: var(--text-muted);">{{ c.code }}</span>
                      @if (isUsd(c)) {
                        <span class="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full ms-1.5"
                          style="background: rgba(245,158,11,0.12); color: rgba(217,119,6,0.95);">
                          {{ 'admin.currencies.baseCurrency' | translate }}
                        </span>
                      }
                    </td>
                    <td style="color: var(--text-faint);">{{ c.symbol }}</td>
                    <td style="color: var(--text-faint);">{{ c.rate }}</td>
                    <td>
                      <div class="flex items-center justify-end gap-1.5">
                        <button (click)="openRates(c)" class="w-8 h-8 rounded-lg flex items-center justify-center"
                          style="color: var(--text-faint); background: var(--bg-subtle-sm);"
                          [title]="'admin.currencies.viewRates' | translate">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
                          </svg>
                        </button>
                        @if (!isUsd(c)) {
                          <button (click)="openEdit(c)" class="w-8 h-8 rounded-lg flex items-center justify-center"
                            style="color: var(--text-faint); background: var(--bg-subtle-sm);"
                            [title]="'common.edit' | translate">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          <button (click)="confirmDelete(c)" class="w-8 h-8 rounded-lg flex items-center justify-center"
                            style="color: rgba(239,68,68,0.55); background: rgba(239,68,68,0.07);"
                            [title]="'common.delete' | translate">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="pagination-row">
          <button class="pagination-btn" [disabled]="filter.value().pageNumber <= 1" (click)="prevPage()">{{ 'common.back' | translate }}</button>
          <span class="pagination-info">{{ 'common.page' | translate }} {{ filter.value().pageNumber }}</span>
          <button class="pagination-btn" [disabled]="!hasMore()" (click)="nextPage()">{{ 'common.next' | translate }}</button>
        </div>
      }
    </div>

    <!-- Create / Edit Modal -->
    @if (showModal()) {
      <div class="modal-backdrop" (click)="closeModal()"></div>
      <div class="modal-box" style="max-width:520px">
        <h2 class="modal-title">{{ editingCurrency() ? ('admin.currencies.editCurrency' | translate) : ('admin.currencies.addCurrency' | translate) }}</h2>

        @if (modalError()) {
          <div class="modal-error">{{ modalError() }}</div>
        }

        <div class="form-grid">
          <div class="form-field">
            <label class="form-label">{{ 'admin.currencies.arabicName' | translate }}</label>
            <input class="form-input" type="text" maxlength="100" [value]="form.arabicName" (input)="form.arabicName = $any($event.target).value" [disabled]="submitting()" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ 'admin.currencies.englishName' | translate }}</label>
            <input class="form-input" type="text" maxlength="100" [value]="form.englishName" (input)="form.englishName = $any($event.target).value" [disabled]="submitting()" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ 'admin.currencies.code' | translate }}</label>
            <input class="form-input" type="text" maxlength="5" style="text-transform:uppercase" [value]="form.code" (input)="form.code = $any($event.target).value.toUpperCase()" [disabled]="submitting()" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ 'admin.currencies.symbol' | translate }}</label>
            <input class="form-input" type="text" maxlength="10" [value]="form.symbol" (input)="form.symbol = $any($event.target).value" [disabled]="submitting()" />
          </div>
          <div class="form-field form-field-full">
            <label class="form-label">{{ 'admin.currencies.rate' | translate }}</label>
            <input class="form-input" type="number" min="0" step="0.0001"
              [value]="form.rate" (input)="form.rate = $any($event.target).valueAsNumber"
              [disabled]="submitting() || isUsdCode(form.code)" />
            @if (isUsdCode(form.code)) {
              <p style="font-size:0.7rem;color:var(--text-faint);margin-top:4px">{{ 'admin.currencies.usdRateLockedHint' | translate }}</p>
            } @else if (editingCurrency()) {
              <p style="font-size:0.7rem;color:var(--text-faint);margin-top:4px">{{ 'admin.currencies.rateChangeHint' | translate }}</p>
            }
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-ghost" (click)="closeModal()" [disabled]="submitting()">{{ 'common.cancel' | translate }}</button>
          <button class="btn-primary" (click)="submit()" [disabled]="submitting()">
            {{ submitting() ? ('common.saving' | translate) : ('common.save' | translate) }}
          </button>
        </div>
      </div>
    }

    <!-- Delete Confirm Modal -->
    @if (deleteTarget()) {
      <div class="modal-backdrop" (click)="deleteTarget.set(null)"></div>
      <div class="modal-box" style="max-width:400px">
        <h2 class="modal-title">{{ 'admin.currencies.confirmDelete' | translate }}</h2>
        <p style="font-size:0.875rem;color:var(--text-muted);margin-bottom:20px">
          {{ 'admin.currencies.confirmDeleteMsg' | translate }} <strong>{{ deleteTarget()?.arabicName }}</strong>؟
        </p>
        @if (modalError()) { <div class="modal-error">{{ modalError() }}</div> }
        <div class="modal-actions">
          <button class="btn-ghost" (click)="deleteTarget.set(null)" [disabled]="submitting()">{{ 'common.cancel' | translate }}</button>
          <button class="btn-danger" (click)="deleteCurrency()" [disabled]="submitting()">
            {{ submitting() ? ('common.deleting' | translate) : ('common.delete' | translate) }}
          </button>
        </div>
      </div>
    }

    <!-- Rate History Modal -->
    @if (ratesTarget()) {
      <div class="modal-backdrop" (click)="ratesTarget.set(null)"></div>
      <div class="modal-box" style="max-width:480px">
        <h2 class="modal-title">{{ 'admin.currencies.ratesTitle' | translate }} — {{ ratesTarget()?.code }}</h2>
        @if (ratesLoading()) {
          <div class="loading-state"><div class="spinner"></div></div>
        } @else if (rates().length === 0) {
          <p style="font-size:0.875rem;color:var(--text-faint)">{{ 'admin.currencies.ratesEmpty' | translate }}</p>
        } @else {
          <div style="max-height:340px;overflow-y:auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>{{ 'admin.currencies.colRate' | translate }}</th>
                  <th>{{ 'admin.currencies.effectiveFrom' | translate }}</th>
                  <th>{{ 'admin.currencies.change' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (r of rates(); track r.id; let i = $index) {
                  <tr>
                    <td style="color: var(--text-base); font-weight: 600;">{{ r.rate }}</td>
                    <td style="color: var(--text-faint);">{{ formatDate(r.effectiveFrom) }}</td>
                    <td style="color: var(--text-faint);">
                      @if (i < rates().length - 1) {
                        {{ changePct(r.rate, rates()[i + 1].rate) }}
                      } @else {
                        —
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <div class="modal-actions">
          <button class="btn-ghost" (click)="ratesTarget.set(null)">{{ 'common.close' | translate }}</button>
        </div>
      </div>
    }
  `,
})
export class CurrenciesComponent implements OnInit {
  private readonly currencyService = inject(CurrencyService);
  private readonly lang            = inject(LanguageService);

  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    code:       '',
    name:       '',
    pageNumber: 1,
    pageSize:   10,
  });

  currencies = signal<Currency[]>([]);
  loading    = signal(true);
  listError  = signal<string | null>(null);
  hasMore    = signal(false);

  showModal       = signal(false);
  editingCurrency = signal<Currency | null>(null);
  deleteTarget    = signal<Currency | null>(null);
  submitting      = signal(false);
  modalError      = signal<string | null>(null);

  ratesTarget  = signal<Currency | null>(null);
  ratesLoading = signal(false);
  rates        = signal<CurrencyRate[]>([]);

  form: { arabicName: string; englishName: string; code: string; symbol: string; rate: number } =
    { arabicName: '', englishName: '', code: '', symbol: '', rate: 0 };

  ngOnInit(): void { this.load(); }

  isUsd(c: Currency): boolean { return c.code?.toUpperCase() === 'USD'; }
  isUsdCode(code: string): boolean { return code?.toUpperCase() === 'USD'; }

  load(): void {
    this.loading.set(true);
    const { code, name, pageNumber, pageSize } = this.filter.value();
    this.currencyService.getAll({ pageNumber, pageSize, code: code || undefined, name: name || undefined }).subscribe({
      next: res => {
        this.currencies.set(res.items ?? []);
        this.hasMore.set(pageNumber * pageSize < res.totalCount);
        this.loading.set(false);
        this.listError.set(null);
      },
      error: (err: any) => { this.loading.set(false); this.listError.set(this.apiErr(err)); },
    });
  }

  onCodeSearch(value: string): void { this.filter.set({ code: value, pageNumber: 1 }); this.load(); }
  onNameSearch(value: string): void { this.filter.set({ name: value, pageNumber: 1 }); this.load(); }

  prevPage(): void {
    if (this.filter.value().pageNumber <= 1) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber - 1 });
    this.load();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber + 1 });
    this.load();
  }

  openCreate(): void {
    this.editingCurrency.set(null);
    this.form = { arabicName: '', englishName: '', code: '', symbol: '', rate: 0 };
    this.modalError.set(null);
    this.showModal.set(true);
  }

  openEdit(currency: Currency): void {
    this.editingCurrency.set(currency);
    this.form = {
      arabicName: currency.arabicName, englishName: currency.englishName,
      code: currency.code, symbol: currency.symbol, rate: currency.rate,
    };
    this.modalError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  submit(): void {
    if (!this.form.arabicName.trim() || !this.form.englishName.trim() || !this.form.code.trim() || !this.form.symbol.trim()) {
      this.modalError.set(this.lang.t('admin.currencies.fieldsRequired'));
      return;
    }
    if (this.isUsdCode(this.form.code)) this.form.rate = 1;
    if (!(this.form.rate > 0)) {
      this.modalError.set(this.lang.t('admin.currencies.rateMustBePositive'));
      return;
    }
    this.submitting.set(true);
    this.modalError.set(null);
    const editing = this.editingCurrency();

    if (editing) {
      const payload: UpdateCurrencyRequest = {
        arabicName: this.form.arabicName, englishName: this.form.englishName,
        code: this.form.code, symbol: this.form.symbol, rate: this.form.rate,
      };
      this.currencyService.update(editing.id, payload).subscribe({
        next: () => { this.submitting.set(false); this.closeModal(); this.load(); },
        error: (err: any) => { this.submitting.set(false); this.modalError.set(this.apiErr(err)); },
      });
    } else {
      const payload: CreateCurrencyRequest = {
        arabicName: this.form.arabicName, englishName: this.form.englishName,
        code: this.form.code, symbol: this.form.symbol, rate: this.form.rate,
        idempotencyKey: crypto.randomUUID(),
      };
      this.currencyService.create(payload).subscribe({
        next: () => { this.submitting.set(false); this.closeModal(); this.filter.set({ pageNumber: 1 }); this.load(); },
        error: (err: any) => { this.submitting.set(false); this.modalError.set(this.apiErr(err)); },
      });
    }
  }

  confirmDelete(currency: Currency): void { this.deleteTarget.set(currency); this.modalError.set(null); }

  deleteCurrency(): void {
    const t = this.deleteTarget();
    if (!t) return;
    this.submitting.set(true);
    this.currencyService.delete(t.id).subscribe({
      next: () => { this.submitting.set(false); this.deleteTarget.set(null); this.load(); },
      error: (err: any) => { this.submitting.set(false); this.modalError.set(this.apiErr(err)); },
    });
  }

  openRates(currency: Currency): void {
    this.ratesTarget.set(currency);
    this.ratesLoading.set(true);
    this.rates.set([]);
    this.currencyService.getRates(currency.id, { pageNumber: 1, pageSize: 50 }).subscribe({
      next: res => { this.rates.set(res.items ?? []); this.ratesLoading.set(false); },
      error: () => { this.ratesLoading.set(false); },
    });
  }

  changePct(current: number, previous: number): string {
    if (!previous) return '—';
    const pct = ((current - previous) / previous) * 100;
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  apiErr(err: any): string {
    if (err?.status === 0) return this.lang.t('errors.unexpected');
    const b = err?.error;
    if (!b) return this.lang.t('errors.unexpected');
    if (typeof b === 'string' && b.trim()) return b.trim();
    for (const k of ['title', 'message', 'detail']) { if (typeof b[k] === 'string' && b[k].trim()) return b[k]; }
    return this.lang.t('errors.unexpected');
  }
}
