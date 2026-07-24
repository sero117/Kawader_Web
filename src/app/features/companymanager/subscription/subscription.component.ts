import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { PlanService } from '../../../core/services/plan.service';
import { Subscription, SubscriptionStatus, RedeemCardRequest } from '../../../core/models/subscription.models';
import { Plan } from '../../../core/models/plan.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [TranslatePipe, DatePipe],
  template: `
    <div class="page-content">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ 'manager.subscription.title' | translate }}</h1>
          <p class="page-subtitle">{{ 'manager.subscription.subtitle' | translate }}</p>
        </div>
        <button class="btn-primary" (click)="openRedeem()">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:16px;height:16px">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 18h16.5a1.5 1.5 0 001.5-1.5V7.5a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v9a1.5 1.5 0 001.5 1.5z"/>
          </svg>
          {{ 'manager.subscription.redeemBtn' | translate }}
        </button>
      </div>

      <!-- My Subscription Card -->
      @if (subLoading()) {
        <div class="loading-state"><div class="spinner"></div></div>
      } @else if (subError()) {
        <div class="error-banner">{{ subError() }}</div>
      } @else if (mySub()) {
        <div class="sub-hero">
          <div class="sub-hero-shine"></div>
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.75rem;flex-wrap:wrap">
            <div>
              <div class="sub-hero-label">{{ 'manager.subscription.currentPlan' | translate }}</div>
              <div class="sub-hero-plan">{{ mySub()!.planName }}</div>
              <div class="sub-hero-meta">
                <span>{{ 'manager.subscription.from' | translate }}: {{ mySub()!.startDate | date:'mediumDate' }}</span>
                <span>{{ 'manager.subscription.to' | translate }}: {{ mySub()!.endDate | date:'mediumDate' }}</span>
              </div>
            </div>
            <span class="sub-status-badge"
              [class.sub-status-active]="mySub()!.status === SubscriptionStatus.Active"
              [class.sub-status-expired]="mySub()!.status === SubscriptionStatus.Expired"
              [class.sub-status-pending]="mySub()!.status === SubscriptionStatus.Pending">
              {{ subStatusLabel(mySub()!.status) }}
            </span>
          </div>
          <div class="sub-limits-grid">
            <div class="sub-limit-item">
              <span class="sub-limit-label">{{ 'manager.subscription.maxEmployees' | translate }}</span>
              <span class="sub-limit-value">{{ mySub()!.maxEmployees }}</span>
            </div>
            <div class="sub-limit-item">
              <span class="sub-limit-label">{{ 'manager.subscription.maxBranches' | translate }}</span>
              <span class="sub-limit-value">{{ mySub()!.maxBranches }}</span>
            </div>
            <div class="sub-limit-item">
              <span class="sub-limit-label">{{ 'manager.subscription.maxSections' | translate }}</span>
              <span class="sub-limit-value">{{ mySub()!.maxSections }}</span>
            </div>
          </div>
        </div>
      } @else {
        <div class="empty-state" style="border:1px solid var(--border);border-radius:14px;padding:2.5rem">
          <div class="empty-state-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 18h16.5a1.5 1.5 0 001.5-1.5V7.5a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v9a1.5 1.5 0 001.5 1.5z"/>
            </svg>
          </div>
          <p class="empty-state-title">{{ 'manager.subscription.noSub' | translate }}</p>
          <p class="empty-state-body">{{ 'manager.subscription.noSubHint' | translate }}</p>
          <button class="btn-primary" style="margin-top:0.75rem" (click)="openRedeem()">
            {{ 'manager.subscription.redeemBtn' | translate }}
          </button>
        </div>
      }

      <!-- Browse Plans -->
      <div>
        <h2 class="page-title" style="font-size:1rem;margin-bottom:0.75rem">{{ 'manager.subscription.plansTitle' | translate }}</h2>
        @if (plansLoading()) {
          <div class="loading-state" style="min-height:120px"><div class="spinner"></div></div>
        } @else if (publicPlans().length === 0) {
          <p style="font-size:0.8125rem;color:var(--text-faint)">{{ 'manager.subscription.noPlans' | translate }}</p>
        } @else {
          <div class="plans-grid">
            @for (plan of publicPlans(); track plan.id) {
              <div class="plan-card" [class.plan-card-recommended]="plan.isRecommended">
                @if (plan.isRecommended) {
                  <div class="plan-recommended-badge">
                    <svg fill="currentColor" viewBox="0 0 20 20" style="width:12px;height:12px">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                    {{ 'manager.subscription.recommended' | translate }}
                  </div>
                }
                <div class="plan-card-header">
                  <h3 class="plan-name">{{ plan.name }}</h3>
                  <div class="plan-price">
                    <span class="plan-price-amount">{{ plan.price }}</span>
                    <span class="plan-price-currency">USD</span>
                  </div>
                  <p class="plan-duration">{{ plan.durationDays }} {{ 'manager.subscription.days' | translate }}</p>
                </div>
                <div class="plan-limits">
                  <div class="plan-limit-item">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
                    </svg>
                    <span>{{ plan.maxEmployees }} {{ 'manager.subscription.employees' | translate }}</span>
                  </div>
                  <div class="plan-limit-item">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21"/>
                    </svg>
                    <span>{{ plan.maxBranches }} {{ 'manager.subscription.branches' | translate }}</span>
                  </div>
                  <div class="plan-limit-item">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/>
                    </svg>
                    <span>{{ plan.maxSections }} {{ 'manager.subscription.sections' | translate }}</span>
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
              </div>
            }
          </div>
        }
      </div>

    </div>

    <!-- Redeem Modal -->
    @if (showRedeem()) {
      <div class="modal-backdrop" (click)="!submitting() && showRedeem.set(false)"></div>
      <div class="modal-box" style="max-width:400px">
        <h2 class="modal-title">{{ 'manager.subscription.redeemTitle' | translate }}</h2>
        <p style="font-size:0.8125rem;color:var(--text-faint);margin:-0.5rem 0 1rem">{{ 'manager.subscription.redeemHint' | translate }}</p>
        @if (redeemError()) { <div class="modal-error">{{ redeemError() }}</div> }
        @if (redeemSuccess()) {
          <div style="padding:0.75rem 1rem;border-radius:10px;background:rgba(5,150,105,0.1);border:1px solid rgba(5,150,105,0.2);color:#059669;font-size:0.875rem;margin-bottom:1rem">
            {{ 'manager.subscription.redeemSuccess' | translate }}
          </div>
        }
        <div class="form-grid">
          <div class="form-field form-field-full">
            <label class="form-label">{{ 'manager.subscription.serialLabel' | translate }}</label>
            <input class="form-input" type="text" [value]="redeemForm.serialNumber" (input)="redeemForm.serialNumber = $any($event.target).value" [placeholder]="'manager.subscription.serialPlaceholder' | translate" [disabled]="submitting()" />
          </div>
          <div class="form-field form-field-full">
            <label class="form-label">{{ 'manager.subscription.codeLabel' | translate }}</label>
            <input class="form-input" type="text" [value]="redeemForm.code" (input)="redeemForm.code = $any($event.target).value" [placeholder]="'manager.subscription.codePlaceholder' | translate" [disabled]="submitting()" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" (click)="showRedeem.set(false)" [disabled]="submitting()">{{ 'common.cancel' | translate }}</button>
          <button class="btn-primary" (click)="redeem()" [disabled]="submitting()">
            {{ submitting() ? ('common.saving' | translate) : ('manager.subscription.redeemBtn' | translate) }}
          </button>
        </div>
      </div>
    }
  `,
})
export class SubscriptionComponent implements OnInit {
  private readonly subService  = inject(SubscriptionService);
  private readonly planService = inject(PlanService);
  private readonly lang        = inject(LanguageService);

  readonly SubscriptionStatus = SubscriptionStatus;

  mySub        = signal<Subscription | null>(null);
  subLoading   = signal(true);
  subError     = signal<string | null>(null);
  publicPlans  = signal<Plan[]>([]);
  plansLoading = signal(true);

  showRedeem   = signal(false);
  submitting   = signal(false);
  redeemError  = signal<string | null>(null);
  redeemSuccess = signal(false);

  redeemForm = { serialNumber: '', code: '' };

  ngOnInit(): void {
    this.loadMySub();
    this.loadPlans();
  }

  loadMySub(): void {
    this.subLoading.set(true);
    this.subService.getMy().subscribe({
      next: (sub) => { this.mySub.set(sub); this.subLoading.set(false); },
      error: (err: any) => {
        if (err?.status === 404) { this.mySub.set(null); this.subLoading.set(false); }
        else { this.subLoading.set(false); this.subError.set(this.apiErr(err)); }
      },
    });
  }

  loadPlans(): void {
    this.plansLoading.set(true);
    this.planService.getAll({ pageNumber: 1, pageSize: 50 }).subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res;
        const all: Plan[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        this.publicPlans.set(all.filter(p => p.showPlan));
        this.plansLoading.set(false);
      },
      error: () => { this.plansLoading.set(false); },
    });
  }

  openRedeem(): void {
    this.redeemForm = { serialNumber: '', code: '' };
    this.redeemError.set(null);
    this.redeemSuccess.set(false);
    this.showRedeem.set(true);
  }

  redeem(): void {
    if (!this.redeemForm.serialNumber.trim() || !this.redeemForm.code.trim()) {
      this.redeemError.set(this.lang.t('manager.subscription.fieldRequired'));
      return;
    }
    this.submitting.set(true);
    const payload: RedeemCardRequest = { serialNumber: this.redeemForm.serialNumber.trim(), code: this.redeemForm.code.trim() };
    this.subService.redeem(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.redeemSuccess.set(true);
        this.redeemError.set(null);
        setTimeout(() => { this.showRedeem.set(false); this.loadMySub(); }, 1500);
      },
      error: (err: any) => {
        this.submitting.set(false);
        let msg = this.apiErr(err);
        if (err?.status === 404) msg = 'الكرت غير موجود. تحقق من الرقم التسلسلي والكود.';
        else if (err?.status === 409) msg = 'هذا الكرت ملغى أو مستخدم مسبقاً ولا يمكن تفعيله.';
        else if (err?.status === 400 && !msg.includes(' ')) msg = 'الكرت غير صالح للتفعيل.';
        this.redeemError.set(msg);
      },
    });
  }

  subStatusLabel(s: SubscriptionStatus): string {
    switch (s) {
      case SubscriptionStatus.Active:  return this.lang.t('manager.subscription.active');
      case SubscriptionStatus.Expired: return this.lang.t('manager.subscription.expired');
      case SubscriptionStatus.Pending: return this.lang.t('manager.subscription.pending');
    }
  }

  apiErr(err: any): string {
    const b = err?.error;
    if (!b) return this.lang.t('errors.unexpected');
    for (const k of ['title', 'message', 'detail']) { if (typeof b[k] === 'string' && b[k].trim()) return b[k]; }
    return this.lang.t('errors.unexpected');
  }
}
