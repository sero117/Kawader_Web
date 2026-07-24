import { Component, signal, inject, OnInit } from '@angular/core';
import { CardService } from '../../../core/services/card.service';
import { PlanService } from '../../../core/services/plan.service';
import { Card, CardStatus, CreateCardRequest, GetCardsParams } from '../../../core/models/card.models';
import { Plan } from '../../../core/models/plan.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="page-content">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ 'admin.cards.title' | translate }}</h1>
          <p class="page-subtitle">{{ 'admin.cards.subtitle' | translate }}</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn-ghost" (click)="openExportModal()">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:15px;height:15px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
            </svg>
            {{ 'admin.cards.export' | translate }}
          </button>
          <button class="btn-primary" (click)="openGenerate()">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:16px;height:16px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
            </svg>
            {{ 'admin.cards.generate' | translate }}
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <input class="filter-input" type="text" [value]="filterSerial()" (input)="filterSerial.set($any($event.target).value)" placeholder="{{ 'admin.cards.searchSerial' | translate }}" />
        <input class="filter-input" type="text" [value]="filterDistinct()" (input)="filterDistinct.set($any($event.target).value)" placeholder="{{ 'admin.cards.searchBatch' | translate }}" />
        <select class="filter-select" [value]="filterStatus()" (change)="onStatusFilter($any($event.target).value)">
          <option value="">{{ 'admin.cards.allStatuses' | translate }}</option>
          <option value="1">{{ 'admin.cards.available' | translate }}</option>
          <option value="2">{{ 'admin.cards.used' | translate }}</option>
          <option value="3">{{ 'admin.cards.revoked' | translate }}</option>
        </select>
        <select class="filter-select" [value]="filterPlan()" (change)="onPlanFilter($any($event.target).value)">
          <option value="">{{ 'admin.cards.allPlans' | translate }}</option>
          @for (p of plans(); track p.id) {
            <option [value]="p.id">{{ p.name }}</option>
          }
        </select>
        <button class="btn-ghost" (click)="applyFilter()">{{ 'admin.cards.search' | translate }}</button>
      </div>

      <!-- Error -->
      @if (listError()) { <div class="error-banner">{{ listError() }}</div> }

      <!-- Cards Grid -->
      @if (loading()) {
        <div class="loading-state"><div class="spinner"></div></div>
      } @else if (cards().length === 0) {
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/>
            </svg>
          </div>
          <p class="empty-state-title">{{ 'admin.cards.empty' | translate }}</p>
        </div>
      } @else {
        <div class="cards-grid">
          @for (card of cards(); track card.id) {
            <div class="gift-card" [class.gift-card-used]="card.status === CardStatus.Used" [class.gift-card-revoked]="card.status === CardStatus.Revoked">
              <!-- Card shine effect -->
              <div class="gift-card-shine"></div>

              <!-- Top row -->
              <div class="gift-card-top">
                <div class="gift-card-brand">
                  <svg viewBox="0 0 100 100" width="24" height="24" style="border-radius:6px;flex-shrink:0">
                    <rect x="2" y="2" width="96" height="96" rx="28" fill="rgba(255,255,255,0.25)"/>
                    <g fill="#FFFFFF">
                      <g opacity="0.8"><circle cx="31" cy="45" r="7"/><rect x="24" y="53" width="14" height="25" rx="7"/></g>
                      <g opacity="0.8"><circle cx="69" cy="45" r="7"/><rect x="62" y="53" width="14" height="25" rx="7"/></g>
                      <circle cx="50" cy="37" r="9.5"/><rect x="38.5" y="48" width="23" height="32" rx="11.5"/>
                    </g>
                  </svg>
                  <span class="gift-card-plan">{{ card.planName }}</span>
                </div>
                <span class="gift-card-status-badge" [class.badge-available]="card.status === CardStatus.Available" [class.badge-used]="card.status === CardStatus.Used" [class.badge-revoked]="card.status === CardStatus.Revoked">
                  {{ statusLabel(card.status) }}
                </span>
              </div>

              <!-- Serial -->
              <div class="gift-card-serial-label">{{ 'admin.cards.serial' | translate }}</div>
              <div class="gift-card-serial">{{ card.serialNumber }}</div>

              <!-- Code -->
              <div class="gift-card-code-row">
                <div>
                  <div class="gift-card-serial-label">{{ 'admin.cards.code' | translate }}</div>
                  <div class="gift-card-code">{{ card.code }}</div>
                </div>
                <div style="text-align:end">
                  <div class="gift-card-serial-label">{{ 'admin.cards.batch' | translate }}</div>
                  <div class="gift-card-code" style="font-size:0.7rem">{{ card.distinct || '—' }}</div>
                </div>
              </div>

              @if (card.status === CardStatus.Used && card.usedByCompanyName) {
                <div class="gift-card-used-by">{{ 'admin.cards.usedBy' | translate }}: {{ card.usedByCompanyName }}</div>
              }

              <!-- Actions -->
              <div class="gift-card-actions">
                @if (card.status === CardStatus.Available) {
                  <button class="gift-card-btn gift-card-btn-revoke" (click)="confirmRevoke(card)">
                    {{ 'admin.cards.revoke' | translate }}
                  </button>
                }
                <button class="gift-card-btn gift-card-btn-delete" (click)="confirmDelete(card)">
                  {{ 'common.delete' | translate }}
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Pagination -->
        <div class="pagination-row">
          <button class="pagination-btn" [disabled]="page() <= 1" (click)="prevPage()">{{ 'common.back' | translate }}</button>
          <span class="pagination-info">{{ 'common.page' | translate }} {{ page() }}</span>
          <button class="pagination-btn" [disabled]="!hasMore()" (click)="nextPage()">{{ 'common.next' | translate }}</button>
        </div>
      }
    </div>

    <!-- Generate Modal -->
    @if (showGenerate()) {
      <div class="modal-backdrop" (click)="showGenerate.set(false)"></div>
      <div class="modal-box" style="max-width:440px">
        <h2 class="modal-title">{{ 'admin.cards.generate' | translate }}</h2>
        @if (modalError()) { <div class="modal-error">{{ modalError() }}</div> }

        <div class="form-grid">
          <div class="form-field form-field-full">
            <label class="form-label">{{ 'admin.cards.plan' | translate }}</label>
            <select class="form-input" [value]="genForm.planId" (change)="genForm.planId = +$any($event.target).value" [disabled]="submitting()">
              <option value="0">{{ 'admin.cards.selectPlan' | translate }}</option>
              @for (p of plans(); track p.id) {
                <option [value]="p.id">{{ p.name }} — {{ p.price }} USD</option>
              }
            </select>
          </div>
          <div class="form-field">
            <label class="form-label">{{ 'admin.cards.count' | translate }}</label>
            <input class="form-input" type="number" min="1" max="500" [value]="genForm.count" (input)="genForm.count = +$any($event.target).value" [disabled]="submitting()" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ 'admin.cards.batch' | translate }}</label>
            <input class="form-input" type="text" [value]="genForm.distinct" (input)="genForm.distinct = $any($event.target).value" placeholder="{{ 'admin.cards.batchHint' | translate }}" [disabled]="submitting()" />
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-ghost" (click)="showGenerate.set(false)" [disabled]="submitting()">{{ 'common.cancel' | translate }}</button>
          <button class="btn-primary" (click)="generate()" [disabled]="submitting()">
            {{ submitting() ? ('common.saving' | translate) : ('admin.cards.generate' | translate) }}
          </button>
        </div>
      </div>
    }

    <!-- Revoke Confirm -->
    @if (revokeTarget()) {
      <div class="modal-backdrop" (click)="revokeTarget.set(null)"></div>
      <div class="modal-box" style="max-width:380px">
        <h2 class="modal-title">{{ 'admin.cards.confirmRevoke' | translate }}</h2>
        <p style="font-size:0.875rem;color:var(--text-muted);margin-bottom:20px">{{ revokeTarget()?.serialNumber }}</p>
        @if (modalError()) { <div class="modal-error">{{ modalError() }}</div> }
        <div class="modal-actions">
          <button class="btn-ghost" (click)="revokeTarget.set(null)" [disabled]="submitting()">{{ 'common.cancel' | translate }}</button>
          <button class="btn-danger" (click)="revokeCard()" [disabled]="submitting()">{{ 'admin.cards.revoke' | translate }}</button>
        </div>
      </div>
    }

    <!-- Delete Confirm -->
    @if (deleteTarget()) {
      <div class="modal-backdrop" (click)="deleteTarget.set(null)"></div>
      <div class="modal-box" style="max-width:380px">
        <h2 class="modal-title">{{ 'admin.cards.confirmDelete' | translate }}</h2>
        <p style="font-size:0.875rem;color:var(--text-muted);margin-bottom:20px">{{ deleteTarget()?.serialNumber }}</p>
        @if (modalError()) { <div class="modal-error">{{ modalError() }}</div> }
        <div class="modal-actions">
          <button class="btn-ghost" (click)="deleteTarget.set(null)" [disabled]="submitting()">{{ 'common.cancel' | translate }}</button>
          <button class="btn-danger" (click)="deleteCard()" [disabled]="submitting()">{{ 'common.delete' | translate }}</button>
        </div>
      </div>
    }

    <!-- Export Batch Modal -->
    @if (showExportModal()) {
      <div class="modal-backdrop" (click)="showExportModal.set(false)"></div>
      <div class="modal-box" style="max-width:420px">
        <h2 class="modal-title">{{ 'admin.cards.exportSelectBatch' | translate }}</h2>

        @if (exportBatchLoading()) {
          <div class="loading-state" style="padding:32px 0"><div class="spinner"></div></div>
        } @else if (exportBatches().length === 0) {
          <p style="font-size:0.875rem;color:var(--text-muted);text-align:center;padding:24px 0">
            {{ 'admin.cards.noBatches' | translate }}
          </p>
        } @else {
          <div style="display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;margin-bottom:20px">
            @for (b of exportBatches(); track b) {
              <button
                (click)="selectedExportBatch.set(b)"
                style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;border:2px solid;text-align:start;background:transparent;cursor:pointer;transition:all 0.15s"
                [style.border-color]="selectedExportBatch() === b ? 'var(--accent)' : 'var(--border)'"
                [style.background]="selectedExportBatch() === b ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent'">
                <div style="width:16px;height:16px;border-radius:50%;border:2px solid;flex-shrink:0;display:flex;align-items:center;justify-content:center"
                     [style.border-color]="selectedExportBatch() === b ? 'var(--accent)' : 'var(--border)'">
                  @if (selectedExportBatch() === b) {
                    <div style="width:8px;height:8px;border-radius:50%;background:var(--accent)"></div>
                  }
                </div>
                <span style="font-size:0.9rem;font-weight:500;color:var(--text-base)">{{ b }}</span>
              </button>
            }
          </div>
        }

        <div class="modal-actions">
          <button class="btn-ghost" (click)="showExportModal.set(false)" [disabled]="exportDownloading()">
            {{ 'common.cancel' | translate }}
          </button>
          <button class="btn-primary" (click)="doExport()" [disabled]="!selectedExportBatch() || exportBatchLoading() || exportDownloading()">
            @if (exportDownloading()) {
              <div class="spinner" style="width:14px;height:14px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#fff"></div>
            }
            {{ 'admin.cards.exportAndPrint' | translate }}
          </button>
        </div>
      </div>
    }
  `,
})
export class CardsComponent implements OnInit {
  private readonly cardService = inject(CardService);
  private readonly planService = inject(PlanService);
  private readonly auth        = inject(AuthService);
  private readonly lang        = inject(LanguageService);

  readonly CardStatus = CardStatus;

  cards     = signal<Card[]>([]);
  plans     = signal<Plan[]>([]);
  loading   = signal(true);
  listError = signal<string | null>(null);
  hasMore   = signal(false);
  page      = signal(1);

  filterSerial   = signal('');
  filterDistinct = signal('');
  filterStatus   = signal('');
  filterPlan     = signal('');

  showGenerate = signal(false);
  revokeTarget = signal<Card | null>(null);
  deleteTarget = signal<Card | null>(null);
  submitting   = signal(false);
  modalError   = signal<string | null>(null);

  showExportModal     = signal(false);
  exportBatches       = signal<string[]>([]);
  exportBatchLoading  = signal(false);
  selectedExportBatch = signal('');
  exportDownloading   = signal(false);

  genForm = { planId: 0, count: 10, distinct: '' };

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
    const params: GetCardsParams = { pageNumber: this.page(), pageSize: 12 };
    if (this.filterSerial())   params.serialNumber = this.filterSerial();
    if (this.filterDistinct()) params.distinct      = this.filterDistinct();
    if (this.filterStatus())   params.status        = +this.filterStatus() as CardStatus;
    if (this.filterPlan())     params.planId        = +this.filterPlan();

    this.cardService.getAll(params).subscribe({
      next: (res: any) => {
        const raw   = res?.data ?? res;
        const items: Card[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const total = raw?.totalCount ?? items.length;
        this.cards.set(items);
        this.hasMore.set(this.page() * 12 < total);
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

  openGenerate(): void {
    this.genForm = { planId: 0, count: 10, distinct: '' };
    this.modalError.set(null);
    this.showGenerate.set(true);
  }

  generate(): void {
    if (!this.genForm.planId) { this.modalError.set(this.lang.t('admin.cards.selectPlanRequired')); return; }
    if (this.genForm.count < 1) { this.modalError.set(this.lang.t('admin.cards.countRequired')); return; }
    this.submitting.set(true);
    const payload: CreateCardRequest = { planId: this.genForm.planId, count: this.genForm.count, distinct: this.genForm.distinct, idempotencyKey: crypto.randomUUID() };
    this.cardService.create(payload).subscribe({
      next: () => { this.submitting.set(false); this.showGenerate.set(false); this.load(); },
      error: (err: any) => { this.submitting.set(false); this.modalError.set(this.apiErr(err)); },
    });
  }

  confirmRevoke(card: Card): void { this.revokeTarget.set(card); this.modalError.set(null); }
  revokeCard(): void {
    const t = this.revokeTarget();
    if (!t) return;
    this.submitting.set(true);
    this.cardService.revoke(t.id).subscribe({
      next: () => { this.submitting.set(false); this.revokeTarget.set(null); this.load(); },
      error: (err: any) => { this.submitting.set(false); this.modalError.set(this.apiErr(err)); },
    });
  }

  confirmDelete(card: Card): void { this.deleteTarget.set(card); this.modalError.set(null); }
  deleteCard(): void {
    const t = this.deleteTarget();
    if (!t) return;
    this.submitting.set(true);
    this.cardService.delete(t.id).subscribe({
      next: () => { this.submitting.set(false); this.deleteTarget.set(null); this.load(); },
      error: (err: any) => { this.submitting.set(false); this.modalError.set(this.apiErr(err)); },
    });
  }

  openExportModal(): void {
    this.showExportModal.set(true);
    this.exportBatchLoading.set(true);
    this.selectedExportBatch.set('');
    this.cardService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res;
        const items: Card[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const batches = [...new Set(items.map(c => c.distinct).filter((d): d is string => !!d))].sort();
        this.exportBatches.set(batches);
        this.exportBatchLoading.set(false);
      },
      error: () => { this.exportBatchLoading.set(false); },
    });
  }

  doExport(): void {
    const batch = this.selectedExportBatch();
    if (!batch) return;
    const token = this.auth.getAccessToken();
    if (!token) return;
    this.exportDownloading.set(true);
    const url = `${environment.apiUrl}/Cards/export?Distinct=${encodeURIComponent(batch)}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error(String(res.status));
        return res.blob();
      })
      .then(blob => {
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = batch;
        a.click();
        URL.revokeObjectURL(objUrl);
        this.exportDownloading.set(false);
        this.showExportModal.set(false);
      })
      .catch(() => {
        this.exportDownloading.set(false);
        this.listError.set(this.lang.t('errors.unexpected'));
      });
  }

  statusLabel(s: CardStatus): string {
    switch (s) {
      case CardStatus.Available: return this.lang.t('admin.cards.available');
      case CardStatus.Used:      return this.lang.t('admin.cards.used');
      case CardStatus.Revoked:   return this.lang.t('admin.cards.revoked');
    }
  }

  apiErr(err: any): string {
    const b = err?.error;
    if (!b) return this.lang.t('errors.unexpected');
    for (const k of ['title', 'message', 'detail']) { if (typeof b[k] === 'string' && b[k].trim()) return b[k]; }
    return this.lang.t('errors.unexpected');
  }
}
