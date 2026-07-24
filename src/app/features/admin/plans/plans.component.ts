import { Component, signal, inject, OnInit } from '@angular/core';
import { PlanService } from '../../../core/services/plan.service';
import { Plan, PlanCurrency, CreatePlanRequest, UpdatePlanRequest } from '../../../core/models/plan.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="page-content">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ 'admin.plans.title' | translate }}</h1>
          <p class="page-subtitle">{{ 'admin.plans.subtitle' | translate }}</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:16px;height:16px">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          {{ 'admin.plans.addPlan' | translate }}
        </button>
      </div>

      <!-- Error -->
      @if (listError()) {
        <div class="error-banner">{{ listError() }}</div>
      }

      <!-- Plans Grid -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
        </div>
      } @else if (plans().length === 0) {
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/>
            </svg>
          </div>
          <p class="empty-state-title">{{ 'admin.plans.empty' | translate }}</p>
        </div>
      } @else {
        <div class="plans-grid">
          @for (plan of plans(); track plan.id) {
            <div class="plan-card" [class.plan-card-recommended]="plan.isRecommended">
              @if (plan.isRecommended) {
                <div class="plan-recommended-badge">
                  <svg fill="currentColor" viewBox="0 0 20 20" style="width:12px;height:12px">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                  {{ 'admin.plans.recommended' | translate }}
                </div>
              }

              <div class="plan-card-header">
                <h3 class="plan-name">{{ plan.name }}</h3>
                <div class="plan-price">
                  <span class="plan-price-amount">{{ plan.price }}</span>
                  <span class="plan-price-currency">{{ plan.currency === 'LYD' ? 'د.ل' : 'USD' }}</span>
                </div>
                <p class="plan-duration">{{ plan.durationDays }} {{ 'admin.plans.days' | translate }}</p>
              </div>

              <div class="plan-limits">
                <div class="plan-limit-item">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
                  </svg>
                  <span>{{ plan.maxEmployees }} {{ 'admin.plans.employees' | translate }}</span>
                </div>
                <div class="plan-limit-item">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21"/>
                  </svg>
                  <span>{{ plan.maxBranches }} {{ 'admin.plans.branches' | translate }}</span>
                </div>
                <div class="plan-limit-item">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/>
                  </svg>
                  <span>{{ plan.maxSections }} {{ 'admin.plans.sections' | translate }}</span>
                </div>
              </div>

              @if (plan.details?.length) {
                <ul class="plan-details">
                  @for (d of plan.details; track d) {
                    <li class="plan-detail-item">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;flex-shrink:0;color:var(--nav-accent)">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                      </svg>
                      {{ d }}
                    </li>
                  }
                </ul>
              }

              <div class="plan-status-row">
                <span class="plan-status-badge" [class.plan-status-visible]="plan.showPlan" [class.plan-status-hidden]="!plan.showPlan">
                  {{ plan.showPlan ? ('admin.plans.visible' | translate) : ('admin.plans.hidden' | translate) }}
                </span>
              </div>

              <!-- Actions -->
              <div class="plan-actions">
                <button class="plan-action-btn" (click)="openEdit(plan)" title="{{ 'common.edit' | translate }}">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/>
                  </svg>
                </button>
                <button class="plan-action-btn" (click)="toggleVisibility(plan)" [title]="plan.showPlan ? ('admin.plans.hide' | translate) : ('admin.plans.show' | translate)">
                  @if (plan.showPlan) {
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
                    </svg>
                  } @else {
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  }
                </button>
                <button class="plan-action-btn" (click)="toggleRecommend(plan)" [title]="plan.isRecommended ? ('admin.plans.unrecommend' | translate) : ('admin.plans.recommend' | translate)">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:14px;height:14px" [style.color]="plan.isRecommended ? 'var(--nav-accent)' : 'inherit'">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                  </svg>
                </button>
                <button class="plan-action-btn plan-action-danger" (click)="confirmDelete(plan)" title="{{ 'common.delete' | translate }}">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                  </svg>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Pagination -->
      @if (plans().length > 0) {
        <div class="pagination-row">
          <button class="pagination-btn" [disabled]="page() <= 1" (click)="prevPage()">{{ 'common.back' | translate }}</button>
          <span class="pagination-info">{{ 'common.page' | translate }} {{ page() }}</span>
          <button class="pagination-btn" [disabled]="!hasMore()" (click)="nextPage()">{{ 'common.next' | translate }}</button>
        </div>
      }
    </div>

    <!-- Create / Edit Modal -->
    @if (showModal()) {
      <div class="modal-backdrop" (click)="closeModal()"></div>
      <div class="modal-box" style="max-width:560px">
        <h2 class="modal-title">{{ editingPlan() ? ('admin.plans.editPlan' | translate) : ('admin.plans.addPlan' | translate) }}</h2>

        @if (modalError()) {
          <div class="modal-error">{{ modalError() }}</div>
        }

        <div class="form-grid">
          <div class="form-field form-field-full">
            <label class="form-label">{{ 'admin.plans.name' | translate }}</label>
            <input #nameInput class="form-input" type="text" [value]="form.name" (input)="form.name = $any($event.target).value" [disabled]="submitting()" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ 'admin.plans.price' | translate }}</label>
            <input class="form-input" type="number" min="0" [value]="form.price" (input)="form.price = +$any($event.target).value" [disabled]="submitting()" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ 'admin.plans.currency' | translate }}</label>
            <div style="display:flex;gap:8px;margin-top:2px">
              @for (cur of currencies; track cur.value) {
                <label style="flex:1;display:flex;align-items:center;gap:8px;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;transition:border-color .15s,background .15s"
                  [style.borderColor]="form.currency === cur.value ? 'var(--nav-accent)' : 'var(--border)'"
                  [style.background]="form.currency === cur.value ? 'color-mix(in srgb, var(--nav-accent) 8%, transparent)' : 'transparent'">
                  <input type="radio" name="planCurrency" [value]="cur.value" [checked]="form.currency === cur.value"
                    (change)="form.currency = cur.value" style="accent-color:var(--nav-accent)" [disabled]="submitting()" />
                  <span style="font-weight:600;font-size:0.85rem">{{ cur.label }}</span>
                  <span style="font-size:0.75rem;color:var(--text-faint)">{{ cur.symbol }}</span>
                </label>
              }
            </div>
          </div>
          <div class="form-field">
            <label class="form-label">{{ 'admin.plans.duration' | translate }}</label>
            <input class="form-input" type="number" min="1" [value]="form.durationDays" (input)="form.durationDays = +$any($event.target).value" [disabled]="submitting()" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ 'admin.plans.maxEmployees' | translate }}</label>
            <input class="form-input" type="number" min="0" [value]="form.maxEmployees" (input)="form.maxEmployees = +$any($event.target).value" [disabled]="submitting()" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ 'admin.plans.maxBranches' | translate }}</label>
            <input class="form-input" type="number" min="0" [value]="form.maxBranches" (input)="form.maxBranches = +$any($event.target).value" [disabled]="submitting()" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ 'admin.plans.maxSections' | translate }}</label>
            <input class="form-input" type="number" min="0" [value]="form.maxSections" (input)="form.maxSections = +$any($event.target).value" [disabled]="submitting()" />
          </div>
          <div class="form-field form-field-full">
            <label class="form-label">{{ 'admin.plans.details' | translate }}</label>
            <textarea class="form-input" rows="3" style="resize:vertical"
              [value]="form.detailsText"
              (input)="form.detailsText = $any($event.target).value"
              placeholder="{{ 'admin.plans.detailsHint' | translate }}" [disabled]="submitting()"></textarea>
          </div>
          <div class="form-field form-field-full" style="display:flex;gap:16px;align-items:center">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.875rem;color:var(--text-muted)">
              <input type="checkbox" [checked]="form.showPlan" (change)="form.showPlan = $any($event.target).checked" [disabled]="submitting()" />
              {{ 'admin.plans.showPlan' | translate }}
            </label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.875rem;color:var(--text-muted)">
              <input type="checkbox" [checked]="form.isRecommended" (change)="form.isRecommended = $any($event.target).checked" [disabled]="submitting()" />
              {{ 'admin.plans.isRecommended' | translate }}
            </label>
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
        <h2 class="modal-title">{{ 'admin.plans.confirmDelete' | translate }}</h2>
        <p style="font-size:0.875rem;color:var(--text-muted);margin-bottom:20px">
          {{ 'admin.plans.confirmDeleteMsg' | translate }} <strong>{{ deleteTarget()?.name }}</strong>؟
        </p>
        @if (modalError()) { <div class="modal-error">{{ modalError() }}</div> }
        <div class="modal-actions">
          <button class="btn-ghost" (click)="deleteTarget.set(null)" [disabled]="submitting()">{{ 'common.cancel' | translate }}</button>
          <button class="btn-danger" (click)="deletePlan()" [disabled]="submitting()">
            {{ submitting() ? ('common.deleting' | translate) : ('common.delete' | translate) }}
          </button>
        </div>
      </div>
    }
  `,
})
export class PlansComponent implements OnInit {
  private readonly planService = inject(PlanService);
  private readonly lang        = inject(LanguageService);

  plans      = signal<Plan[]>([]);
  loading    = signal(true);
  listError  = signal<string | null>(null);
  hasMore    = signal(false);
  page       = signal(1);

  showModal    = signal(false);
  editingPlan  = signal<Plan | null>(null);
  deleteTarget = signal<Plan | null>(null);
  submitting   = signal(false);
  modalError   = signal<string | null>(null);

  readonly currencies: { value: PlanCurrency; label: string; symbol: string }[] = [
    { value: 'USD', label: 'دولار',       symbol: '$'   },
    { value: 'LYD', label: 'دينار ليبي', symbol: 'د.ل' },
  ];

  form: { name: string; price: number; currency: PlanCurrency; durationDays: number; maxEmployees: number; maxBranches: number; maxSections: number; showPlan: boolean; isRecommended: boolean; detailsText: string } =
    { name: '', price: 0, currency: 'USD', durationDays: 30, maxEmployees: 10, maxBranches: 1, maxSections: 5, showPlan: true, isRecommended: false, detailsText: '' };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.planService.getAll({ pageNumber: this.page(), pageSize: 12 }).subscribe({
      next: (res: any) => {
        const raw   = res?.data ?? res;
        const items: Plan[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const total = raw?.totalCount ?? items.length;
        this.plans.set(items);
        this.hasMore.set(this.page() * 12 < total);
        this.loading.set(false);
        this.listError.set(null);
      },
      error: (err: any) => { this.loading.set(false); this.listError.set(this.apiErr(err)); },
    });
  }

  prevPage(): void { this.page.update(p => p - 1); this.load(); }
  nextPage(): void { this.page.update(p => p + 1); this.load(); }

  openCreate(): void {
    this.editingPlan.set(null);
    this.form = { name: '', price: 0, currency: 'USD', durationDays: 30, maxEmployees: 10, maxBranches: 1, maxSections: 5, showPlan: true, isRecommended: false, detailsText: '' };
    this.modalError.set(null);
    this.showModal.set(true);
  }

  openEdit(plan: Plan): void {
    this.editingPlan.set(plan);
    this.form = {
      name: plan.name, price: plan.price, currency: plan.currency ?? 'USD', durationDays: plan.durationDays,
      maxEmployees: plan.maxEmployees, maxBranches: plan.maxBranches, maxSections: plan.maxSections,
      showPlan: plan.showPlan, isRecommended: plan.isRecommended,
      detailsText: (plan.details ?? []).join('\n'),
    };
    this.modalError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  submit(): void {
    if (!this.form.name.trim()) { this.modalError.set(this.lang.t('admin.plans.nameRequired')); return; }
    this.submitting.set(true);
    this.modalError.set(null);
    const details = this.form.detailsText.split('\n').map(s => s.trim()).filter(Boolean);
    const editing = this.editingPlan();

    if (editing) {
      const payload: UpdatePlanRequest = { name: this.form.name, price: this.form.price, currency: this.form.currency, durationDays: this.form.durationDays, details, maxEmployees: this.form.maxEmployees, maxSections: this.form.maxSections, maxBranches: this.form.maxBranches };
      this.planService.update(editing.id, payload).subscribe({
        next: () => { this.submitting.set(false); this.closeModal(); this.load(); },
        error: (err: any) => { this.submitting.set(false); this.modalError.set(this.apiErr(err)); },
      });
    } else {
      const payload: CreatePlanRequest = { name: this.form.name, price: this.form.price, currency: this.form.currency, durationDays: this.form.durationDays, details, showPlan: this.form.showPlan, isRecommended: this.form.isRecommended, maxEmployees: this.form.maxEmployees, maxSections: this.form.maxSections, maxBranches: this.form.maxBranches, idempotencyKey: crypto.randomUUID() };
      this.planService.create(payload).subscribe({
        next: () => { this.submitting.set(false); this.closeModal(); this.load(); },
        error: (err: any) => { this.submitting.set(false); this.modalError.set(this.apiErr(err)); },
      });
    }
  }

  toggleVisibility(plan: Plan): void {
    const call = plan.showPlan ? this.planService.hide(plan.id) : this.planService.show(plan.id);
    call.subscribe({ next: () => this.load(), error: () => {} });
  }

  toggleRecommend(plan: Plan): void {
    const call = plan.isRecommended ? this.planService.unrecommend(plan.id) : this.planService.recommend(plan.id);
    call.subscribe({ next: () => this.load(), error: () => {} });
  }

  confirmDelete(plan: Plan): void { this.deleteTarget.set(plan); this.modalError.set(null); }

  deletePlan(): void {
    const t = this.deleteTarget();
    if (!t) return;
    this.submitting.set(true);
    this.planService.delete(t.id).subscribe({
      next: () => { this.submitting.set(false); this.deleteTarget.set(null); this.load(); },
      error: (err: any) => { this.submitting.set(false); this.modalError.set(this.apiErr(err)); },
    });
  }

  apiErr(err: any): string {
    const b = err?.error;
    if (!b) return this.lang.t('errors.unexpected');
    for (const k of ['title', 'message', 'detail']) { if (typeof b[k] === 'string' && b[k].trim()) return b[k]; }
    return this.lang.t('errors.unexpected');
  }
}
