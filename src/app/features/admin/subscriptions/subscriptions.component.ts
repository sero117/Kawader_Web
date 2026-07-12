import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { PlanService } from '../../../core/services/plan.service';
import { Subscription, SubscriptionStatus, GetSubscriptionsParams } from '../../../core/models/subscription.models';
import { Plan } from '../../../core/models/plan.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [TranslatePipe, DatePipe],
  template: `
    <div class="page-content">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ 'admin.subscriptions.title' | translate }}</h1>
          <p class="page-subtitle">{{ 'admin.subscriptions.subtitle' | translate }}</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <select class="filter-select" [value]="filterStatus()" (change)="onStatusFilter($any($event.target).value)">
          <option value="">{{ 'admin.subscriptions.allStatuses' | translate }}</option>
          <option value="1">{{ 'admin.subscriptions.active' | translate }}</option>
          <option value="2">{{ 'admin.subscriptions.expired' | translate }}</option>
          <option value="3">{{ 'admin.subscriptions.pending' | translate }}</option>
        </select>
        <select class="filter-select" [value]="filterPlan()" (change)="onPlanFilter($any($event.target).value)">
          <option value="">{{ 'admin.subscriptions.allPlans' | translate }}</option>
          @for (p of plans(); track p.id) {
            <option [value]="p.id">{{ p.name }}</option>
          }
        </select>
        <button class="btn-ghost" (click)="applyFilter()">{{ 'admin.subscriptions.search' | translate }}</button>
      </div>

      <!-- Error -->
      @if (listError()) { <div class="error-banner">{{ listError() }}</div> }

      <!-- Table -->
      @if (loading()) {
        <div class="loading-state"><div class="spinner"></div></div>
      } @else if (subs().length === 0) {
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/>
            </svg>
          </div>
          <p class="empty-state-title">{{ 'admin.subscriptions.empty' | translate }}</p>
        </div>
      } @else {
        <div class="subs-table-wrap">
          <table class="subs-table">
            <thead>
              <tr>
                <th>{{ 'admin.subscriptions.colCompany' | translate }}</th>
                <th>{{ 'admin.subscriptions.colPlan' | translate }}</th>
                <th>{{ 'admin.subscriptions.colStatus' | translate }}</th>
                <th>{{ 'admin.subscriptions.colStart' | translate }}</th>
                <th>{{ 'admin.subscriptions.colEnd' | translate }}</th>
                <th>{{ 'admin.subscriptions.colLimits' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (sub of subs(); track sub.id) {
                <tr>
                  <td style="font-weight:600">{{ sub.companyName ?? '—' }}</td>
                  <td>{{ sub.planName }}</td>
                  <td>
                    <span class="subs-status-badge" [class.subs-status-active]="sub.status === SubscriptionStatus.Active" [class.subs-status-expired]="sub.status === SubscriptionStatus.Expired" [class.subs-status-pending]="sub.status === SubscriptionStatus.Pending">
                      {{ statusLabel(sub.status) }}
                    </span>
                  </td>
                  <td>{{ sub.startDate ? (sub.startDate | date:'mediumDate') : '—' }}</td>
                  <td>{{ sub.endDate ? (sub.endDate | date:'mediumDate') : '—' }}</td>
                  <td style="font-size:0.75rem;color:var(--text-faint)">
                    {{ sub.maxEmployees }} emp · {{ sub.maxBranches }} br · {{ sub.maxSections }} sec
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-row">
          <button class="pagination-btn" [disabled]="page() <= 1" (click)="prevPage()">{{ 'common.back' | translate }}</button>
          <span class="pagination-info">{{ 'common.page' | translate }} {{ page() }}</span>
          <button class="pagination-btn" [disabled]="!hasMore()" (click)="nextPage()">{{ 'common.next' | translate }}</button>
        </div>
      }
    </div>
  `,
})
export class SubscriptionsComponent implements OnInit {
  private readonly subService  = inject(SubscriptionService);
  private readonly planService = inject(PlanService);
  private readonly lang        = inject(LanguageService);

  readonly SubscriptionStatus = SubscriptionStatus;

  subs      = signal<Subscription[]>([]);
  plans     = signal<Plan[]>([]);
  loading   = signal(true);
  listError = signal<string | null>(null);
  hasMore   = signal(false);
  page      = signal(1);

  filterStatus = signal('');
  filterPlan   = signal('');

  ngOnInit(): void {
    this.load();
    this.planService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res;
        this.plans.set(Array.isArray(raw) ? raw : (raw?.items ?? []));
      },
      error: () => {},
    });
  }

  load(): void {
    this.loading.set(true);
    const params: GetSubscriptionsParams = { pageNumber: this.page(), pageSize: 15 };
    if (this.filterStatus()) params.status = +this.filterStatus() as SubscriptionStatus;
    if (this.filterPlan())   params.planId = +this.filterPlan();

    this.subService.getAll(params).subscribe({
      next: (res: any) => {
        const raw   = res?.data ?? res;
        const items: Subscription[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const total = raw?.totalCount ?? items.length;
        this.subs.set(items);
        this.hasMore.set(this.page() * 15 < total);
        this.loading.set(false);
        this.listError.set(null);
      },
      error: (err: any) => { this.loading.set(false); this.listError.set(this.apiErr(err)); },
    });
  }

  applyFilter(): void { this.page.set(1); this.load(); }
  onStatusFilter(v: string): void { this.filterStatus.set(v); }
  onPlanFilter(v: string): void { this.filterPlan.set(v); }
  prevPage(): void { this.page.update(p => p - 1); this.load(); }
  nextPage(): void { this.page.update(p => p + 1); this.load(); }

  statusLabel(s: SubscriptionStatus): string {
    switch (s) {
      case SubscriptionStatus.Active:  return this.lang.t('admin.subscriptions.active');
      case SubscriptionStatus.Expired: return this.lang.t('admin.subscriptions.expired');
      case SubscriptionStatus.Pending: return this.lang.t('admin.subscriptions.pending');
    }
  }

  apiErr(err: any): string {
    const b = err?.error;
    if (!b) return this.lang.t('errors.unexpected');
    for (const k of ['title', 'message', 'detail']) { if (typeof b[k] === 'string' && b[k].trim()) return b[k]; }
    return this.lang.t('errors.unexpected');
  }
}
