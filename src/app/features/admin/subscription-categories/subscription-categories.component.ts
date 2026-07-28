import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { SubscriptionCategoryService } from '../../../core/services/subscription-category.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import {
  SubscriptionCategory, CreateSubscriptionCategoryRequest, UpdateSubscriptionCategoryRequest,
} from '../../../core/models/subscription-category.models';
import { formatCompanyDate } from '../../../core/utils/company-time';

@Component({
  selector: 'app-subscription-categories',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="page-content">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ 'admin.subscriptionCategories.title' | translate }}</h1>
          <p class="page-subtitle">{{ 'admin.subscriptionCategories.subtitle' | translate }}</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:16px;height:16px">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          {{ 'admin.subscriptionCategories.addCategory' | translate }}
        </button>
      </div>

      <!-- Filter -->
      <div class="filter-bar">
        <select class="filter-select" [value]="filter.value().showCategory" (change)="onShowFilter($any($event.target).value)">
          <option value="">{{ 'admin.subscriptionCategories.filterAll' | translate }}</option>
          <option value="true">{{ 'admin.subscriptionCategories.filterVisible' | translate }}</option>
          <option value="false">{{ 'admin.subscriptionCategories.filterHidden' | translate }}</option>
        </select>
      </div>

      @if (listError()) {
        <div class="error-banner">{{ listError() }}</div>
      }

      @if (loading()) {
        <div class="loading-state"><div class="spinner"></div></div>
      } @else if (categories().length === 0) {
        <div class="empty-state">
          <p class="empty-state-title">{{ 'admin.subscriptionCategories.empty' | translate }}</p>
        </div>
      } @else {
        <div class="admin-card">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>{{ 'admin.subscriptionCategories.colArabicName' | translate }}</th>
                  <th>{{ 'admin.subscriptionCategories.colEnglishName' | translate }}</th>
                  <th>{{ 'admin.subscriptionCategories.colDuration' | translate }}</th>
                  <th>{{ 'admin.subscriptionCategories.colShowCategory' | translate }}</th>
                  <th>{{ 'admin.subscriptionCategories.colLocked' | translate }}</th>
                  <th>{{ 'admin.subscriptionCategories.colCreated' | translate }}</th>
                  <th style="text-align: right;">{{ 'admin.subscriptionCategories.colActions' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (c of categories(); track c.id) {
                  <tr>
                    <td style="color: var(--text-base); font-weight: 600;">{{ c.arabicName }}</td>
                    <td style="color: var(--text-faint);">{{ c.englishName }}</td>
                    <td style="color: var(--text-faint);">{{ c.durationDays }} {{ 'admin.plans.days' | translate }}</td>
                    <td>
                      <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
                        [style.background]="c.showCategory ? 'rgba(5,150,105,0.1)' : 'rgba(239,68,68,0.08)'"
                        [style.color]="c.showCategory ? '#059669' : 'rgba(239,68,68,0.75)'">
                        {{ (c.showCategory ? 'admin.subscriptionCategories.visible' : 'admin.subscriptionCategories.hidden') | translate }}
                      </span>
                    </td>
                    <td>
                      @if (c.locked) {
                        <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
                          style="background: rgba(99,102,241,0.1); color: rgba(99,102,241,0.9);">
                          {{ 'admin.subscriptionCategories.locked' | translate }}
                        </span>
                      } @else {
                        <span style="color: var(--text-very-faint);">—</span>
                      }
                    </td>
                    <td style="color: var(--text-faint);">{{ formatDate(c.createdAt) }}</td>
                    <td>
                      <div class="flex items-center justify-end gap-1.5">
                        <button (click)="openEdit(c)" class="w-8 h-8 rounded-lg flex items-center justify-center"
                          style="color: var(--text-faint); background: var(--bg-subtle-sm);"
                          [title]="'common.edit' | translate">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button (click)="!c.locked && confirmDelete(c)" class="w-8 h-8 rounded-lg flex items-center justify-center"
                          [style.color]="c.locked ? 'var(--text-very-faint)' : 'rgba(239,68,68,0.55)'"
                          [style.background]="c.locked ? 'var(--bg-subtle-sm)' : 'rgba(239,68,68,0.07)'"
                          [style.cursor]="c.locked ? 'not-allowed' : 'pointer'"
                          [title]="(c.locked ? 'admin.subscriptionCategories.lockedDeleteHint' : 'common.delete') | translate">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
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
      <div class="modal-box" style="max-width:480px">
        <h2 class="modal-title">{{ editingCategory() ? ('admin.subscriptionCategories.editCategory' | translate) : ('admin.subscriptionCategories.addCategory' | translate) }}</h2>

        @if (modalError()) {
          <div class="modal-error">{{ modalError() }}</div>
        }

        @if (editingCategory()?.locked) {
          <p style="font-size:0.78rem;color:var(--text-faint);margin-bottom:12px">{{ 'admin.subscriptionCategories.lockedEditHint' | translate }}</p>
        }

        <div class="form-grid">
          <div class="form-field">
            <label class="form-label">{{ 'admin.subscriptionCategories.arabicName' | translate }}</label>
            <input class="form-input" type="text" maxlength="100" [value]="form.arabicName" (input)="form.arabicName = $any($event.target).value" [disabled]="submitting()" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ 'admin.subscriptionCategories.englishName' | translate }}</label>
            <input class="form-input" type="text" maxlength="100" [value]="form.englishName" (input)="form.englishName = $any($event.target).value" [disabled]="submitting()" />
          </div>
          <div class="form-field form-field-full">
            <label class="form-label">{{ 'admin.subscriptionCategories.duration' | translate }}</label>
            <input class="form-input" type="number" min="1" [value]="form.durationDays" (input)="form.durationDays = +$any($event.target).value" [disabled]="submitting()" />
          </div>
          <div class="form-field-full form-divider"></div>
          <div class="form-field-full plan-toggle-row">
            <label class="plan-toggle-chip" [class.plan-toggle-chip-active]="form.showCategory">
              <input type="checkbox" [checked]="form.showCategory" (change)="form.showCategory = $any($event.target).checked" [disabled]="submitting()" />
              <span class="plan-toggle-check"></span>
              <span>{{ 'admin.subscriptionCategories.showCategory' | translate }}</span>
            </label>
          </div>
          <p style="font-size:0.75rem;color:var(--text-very-faint);margin-top:-4px">{{ 'admin.subscriptionCategories.showCategoryHint' | translate }}</p>
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
        <h2 class="modal-title">{{ 'admin.subscriptionCategories.confirmDelete' | translate }}</h2>
        <p style="font-size:0.875rem;color:var(--text-muted);margin-bottom:20px">
          {{ 'admin.subscriptionCategories.confirmDeleteMsg' | translate }} <strong>{{ deleteTarget()?.arabicName }}</strong>؟
        </p>
        @if (modalError()) { <div class="modal-error">{{ modalError() }}</div> }
        <div class="modal-actions">
          <button class="btn-ghost" (click)="deleteTarget.set(null)" [disabled]="submitting()">{{ 'common.cancel' | translate }}</button>
          <button class="btn-danger" (click)="deleteCategory()" [disabled]="submitting()">
            {{ submitting() ? ('common.deleting' | translate) : ('common.delete' | translate) }}
          </button>
        </div>
      </div>
    }
  `,
})
export class SubscriptionCategoriesComponent implements OnInit {
  private readonly categoryService = inject(SubscriptionCategoryService);
  private readonly lang            = inject(LanguageService);
  private readonly snackbar        = inject(SnackbarService);

  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    showCategory: '',
    pageNumber:   1,
    pageSize:     10,
  });

  categories = signal<SubscriptionCategory[]>([]);
  loading    = signal(true);
  listError  = signal<string | null>(null);
  hasMore    = signal(false);

  showModal       = signal(false);
  editingCategory = signal<SubscriptionCategory | null>(null);
  deleteTarget    = signal<SubscriptionCategory | null>(null);
  submitting      = signal(false);
  modalError      = signal<string | null>(null);

  form: { arabicName: string; englishName: string; durationDays: number; showCategory: boolean } =
    { arabicName: '', englishName: '', durationDays: 30, showCategory: true };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    const { showCategory, pageNumber, pageSize } = this.filter.value();
    this.categoryService.getAll({
      pageNumber, pageSize,
      showCategory: showCategory === '' ? undefined : showCategory === 'true',
    }).subscribe({
      next: res => {
        this.categories.set(res.items ?? []);
        this.hasMore.set(pageNumber * pageSize < res.totalCount);
        this.loading.set(false);
        this.listError.set(null);
      },
      error: (err: any) => { this.loading.set(false); this.listError.set(this.apiErr(err)); },
    });
  }

  onShowFilter(value: string): void {
    this.filter.set({ showCategory: value, pageNumber: 1 });
    this.load();
  }

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
    this.editingCategory.set(null);
    this.form = { arabicName: '', englishName: '', durationDays: 30, showCategory: true };
    this.modalError.set(null);
    this.showModal.set(true);
  }

  openEdit(category: SubscriptionCategory): void {
    this.editingCategory.set(category);
    this.form = {
      arabicName: category.arabicName, englishName: category.englishName,
      durationDays: category.durationDays, showCategory: category.showCategory,
    };
    this.modalError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  submit(): void {
    if (!this.form.arabicName.trim() || !this.form.englishName.trim()) {
      this.snackbar.show(this.lang.t('admin.subscriptionCategories.nameRequired'), 'error');
      return;
    }
    if (!this.form.durationDays || this.form.durationDays < 1) {
      this.snackbar.show(this.lang.t('admin.subscriptionCategories.durationRequired'), 'error');
      return;
    }
    this.submitting.set(true);
    this.modalError.set(null);
    const editing = this.editingCategory();

    if (editing) {
      const payload: UpdateSubscriptionCategoryRequest = {
        arabicName: this.form.arabicName, englishName: this.form.englishName,
        durationDays: this.form.durationDays, showCategory: this.form.showCategory,
      };
      this.categoryService.update(editing.id, payload).subscribe({
        next: () => { this.submitting.set(false); this.closeModal(); this.load(); },
        error: (err: any) => {
          this.submitting.set(false);
          if (err?.status === 412) {
            this.modalError.set(this.lang.t('admin.subscriptionCategories.lockedEditError'));
            return;
          }
          // Anything else (e.g. 409 duplicate English name): the global
          // interceptor already shows it as a snackbar.
        },
      });
    } else {
      const payload: CreateSubscriptionCategoryRequest = {
        arabicName: this.form.arabicName, englishName: this.form.englishName,
        durationDays: this.form.durationDays, showCategory: this.form.showCategory,
        idempotencyKey: crypto.randomUUID(),
      };
      this.categoryService.create(payload).subscribe({
        next: () => { this.submitting.set(false); this.closeModal(); this.filter.set({ pageNumber: 1 }); this.load(); },
        error: () => { this.submitting.set(false); },
      });
    }
  }

  confirmDelete(category: SubscriptionCategory): void { this.deleteTarget.set(category); this.modalError.set(null); }

  deleteCategory(): void {
    const t = this.deleteTarget();
    if (!t) return;
    this.submitting.set(true);
    this.categoryService.delete(t.id).subscribe({
      next: () => { this.submitting.set(false); this.deleteTarget.set(null); this.load(); },
      error: (err: any) => {
        this.submitting.set(false);
        if (err?.status === 412) { this.snackbar.show(this.lang.t('admin.subscriptionCategories.lockedDeleteHint'), 'error'); return; }
        // Anything else: the global interceptor already shows it as a snackbar.
      },
    });
  }

  formatDate(dateStr?: string): string {
    return formatCompanyDate(dateStr, 0);
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
