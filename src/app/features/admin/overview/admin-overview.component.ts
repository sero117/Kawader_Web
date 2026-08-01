import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CompanyService } from '../../../core/services/company.service';
import { AgentService } from '../../../core/services/agent.service';
import { CardService } from '../../../core/services/card.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Company } from '../../../core/models/company.models';
import { CardStatus } from '../../../core/models/card.models';
import { SubscriptionStatus } from '../../../core/models/subscription.models';

interface StatusCounts { total: number; a: number; b: number; c: number; }

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './admin-overview.component.html',
})
export class AdminOverviewComponent implements OnInit {
  private readonly companyService      = inject(CompanyService);
  private readonly agentService        = inject(AgentService);
  private readonly cardService         = inject(CardService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly auth                = inject(AuthService);

  readonly adminName = this.auth.getDisplayName();
  readonly todayDate = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  companies   = signal<Company[]>([]);
  loading     = signal(true);
  agentCount  = signal<number | null>(null);
  cardCounts  = signal<StatusCounts | null>(null);
  subCounts   = signal<StatusCounts | null>(null);

  // ── Active-companies ratio, as a ring ──────────────────────────────────────
  private readonly ringCircumference = 2 * Math.PI * 34;
  readonly activeRate = computed(() => {
    const t = this.total;
    return t > 0 ? Math.round(((t - this.frozenCount) / t) * 100) : 0;
  });
  readonly ringDashOffset = computed(() => this.ringCircumference * (1 - this.activeRate() / 100));

  // ── Month calendar — picking a day filters "recent companies" by that date ─
  selectedDate   = signal<Date | null>(null);
  calendarCursor = signal(new Date());

  readonly calendarLabel = computed(() =>
    this.calendarCursor().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }),
  );

  readonly calendarDays = computed(() => {
    const cursor = this.calendarCursor();
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const selected = this.selectedDate();
    const selectedIso = selected ? this.isoOf(selected) : null;
    const todayIso = this.isoOf(new Date());

    const cells: { day: number | null; iso: string | null; isToday: boolean; isSelected: boolean }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ day: null, iso: null, isToday: false, isSelected: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, iso, isToday: iso === todayIso, isSelected: iso === selectedIso });
    }
    return cells;
  });

  private isoOf(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  prevMonth(): void {
    const c = this.calendarCursor();
    this.calendarCursor.set(new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const c = this.calendarCursor();
    this.calendarCursor.set(new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }

  selectDay(iso: string | null): void {
    if (!iso) return;
    const current = this.selectedDate();
    // Clicking the already-selected day clears the filter back to "recent".
    if (current && this.isoOf(current) === iso) { this.selectedDate.set(null); return; }
    const [y, m, d] = iso.split('-').map(Number);
    this.selectedDate.set(new Date(y, m - 1, d));
  }

  /** Recent-companies list — filtered to the selected calendar day if one is
   *  picked, otherwise the 5 most recent by createdAt. No extra requests:
   *  both views reuse the single already-fetched company list. */
  readonly displayedCompanies = computed(() => {
    const all = this.companies();
    const selected = this.selectedDate();
    if (!selected) {
      return [...all]
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        .slice(0, 5);
    }
    const iso = this.isoOf(selected);
    return all.filter(c => (c.createdAt ?? '').startsWith(iso));
  });

  ngOnInit(): void {
    this.companyService.getAll({ pageSize: 100, pageNumber: 1 }).subscribe({
      next: res => {
        const raw = (res as any)?.data ?? res;
        const items: any[] = Array.isArray(raw)
          ? raw
          : (raw?.items ?? raw?.data ?? []);
        const frozenIds = this.getFrozenIds();
        const normalized: Company[] = items.map(c => ({
          ...c,
          isActive:    c.isActive    !== undefined ? c.isActive    : c.IsActive,
          isCompleted: c.isCompleted !== undefined ? c.isCompleted : c.IsCompleted,
          isFrozen: !!c.isFrozen || !!c.IsFrozen
            || (c.frozenAt != null && c.frozenAt !== '')
            || (c.FrozenAt != null && c.FrozenAt !== '')
            || frozenIds.has(c.id),
        }));
        this.companies.set(normalized);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.agentService.getAll({ pageNumber: 1, pageSize: 1 }, true).subscribe({
      next: res => this.agentCount.set(res?.totalCount ?? 0),
      error: () => this.agentCount.set(null),
    });

    forkJoin([
      this.cardService.getAll({ pageNumber: 1, pageSize: 1 }),
      this.cardService.getAll({ pageNumber: 1, pageSize: 1, status: CardStatus.Available }),
      this.cardService.getAll({ pageNumber: 1, pageSize: 1, status: CardStatus.Used }),
      this.cardService.getAll({ pageNumber: 1, pageSize: 1, status: CardStatus.Revoked }),
    ]).subscribe({
      next: ([total, available, used, revoked]) => this.cardCounts.set({
        total: total?.totalCount ?? 0, a: available?.totalCount ?? 0, b: used?.totalCount ?? 0, c: revoked?.totalCount ?? 0,
      }),
      error: () => this.cardCounts.set(null),
    });

    forkJoin([
      this.subscriptionService.getAll({ pageNumber: 1, pageSize: 1 }),
      this.subscriptionService.getAll({ pageNumber: 1, pageSize: 1, status: SubscriptionStatus.Active }),
      this.subscriptionService.getAll({ pageNumber: 1, pageSize: 1, status: SubscriptionStatus.Expired }),
      this.subscriptionService.getAll({ pageNumber: 1, pageSize: 1, status: SubscriptionStatus.Pending }),
    ]).subscribe({
      next: ([total, active, expired, pending]) => this.subCounts.set({
        total: total?.totalCount ?? 0, a: active?.totalCount ?? 0, b: expired?.totalCount ?? 0, c: pending?.totalCount ?? 0,
      }),
      error: () => this.subCounts.set(null),
    });
  }

  private getFrozenIds(): Set<number> {
    try { return new Set(JSON.parse(localStorage.getItem(this.FROZEN_KEY) ?? '[]')); }
    catch { return new Set(); }
  }

  get total()    { return this.companies().length; }
  get active()   { return this.companies().filter(c => c.isActive).length; }
  get completed(){ return this.companies().filter(c => c.isCompleted).length; }

  private readonly FROZEN_KEY = 'kawader_frozen_companies';
  get frozenCount(): number {
    try { return (JSON.parse(localStorage.getItem(this.FROZEN_KEY) ?? '[]') as number[]).length; }
    catch { return 0; }
  }
}
