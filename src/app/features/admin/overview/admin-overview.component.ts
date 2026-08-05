import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CompanyService } from '../../../core/services/company.service';
import { AgentService } from '../../../core/services/agent.service';
import { CardService } from '../../../core/services/card.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { CountryService } from '../../../core/services/country.service';
import { CurrencyService } from '../../../core/services/currency.service';
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
  private readonly countryService      = inject(CountryService);
  private readonly currencyService     = inject(CurrencyService);
  private readonly auth                = inject(AuthService);

  readonly adminName = this.auth.getDisplayName();
  readonly todayDate = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  companies      = signal<Company[]>([]);
  loading        = signal(true);
  agentCount     = signal<number | null>(null);
  cardCounts     = signal<StatusCounts | null>(null);
  subCounts      = signal<StatusCounts | null>(null);
  countryCount   = signal<number | null>(null);
  currencyCount  = signal<number | null>(null);

  /** Recent-companies list — the 5 most recent by createdAt. */
  readonly displayedCompanies = computed(() =>
    [...this.companies()]
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, 5),
  );

  /** The list endpoint doesn't return companyName (see CompanyService), so the
   *  5 displayed rows fetch their own detail — bounded to exactly 5 requests,
   *  not a per-row fetch over the whole collection. `undefined` = still
   *  loading, `null` = loaded but genuinely has no name yet. */
  private recentNames = signal<Map<number, string | null>>(new Map());

  recentName(id: number): string | null | undefined {
    return this.recentNames().get(id);
  }

  private loadRecentNames(rows: Company[]): void {
    if (!rows.length) return;
    forkJoin(rows.map(c => this.companyService.getByIdCached(c.id))).subscribe({
      next: results => {
        const map = new Map(this.recentNames());
        results.forEach((res, i) => {
          const detail = (res as any)?.data ?? res;
          map.set(rows[i].id, detail?.companyName ?? null);
        });
        this.recentNames.set(map);
      },
      error: () => {
        const map = new Map(this.recentNames());
        rows.forEach(c => map.set(c.id, null));
        this.recentNames.set(map);
      },
    });
  }

  ngOnInit(): void {
    this.companyService.getAll({ pageSize: 100, pageNumber: 1 }).subscribe({
      next: res => {
        const raw = (res as any)?.data ?? res;
        const items: any[] = Array.isArray(raw)
          ? raw
          : (raw?.items ?? raw?.data ?? []);
        const normalized: Company[] = items.map(c => ({
          ...c,
          isActive:    c.isActive    !== undefined ? c.isActive    : c.IsActive,
          isCompleted: c.isCompleted !== undefined ? c.isCompleted : c.IsCompleted,
          isFrozen:    !!(c.isFrozen ?? c.IsFrozen),
        }));
        this.companies.set(normalized);
        this.loading.set(false);
        this.loadRecentNames(this.displayedCompanies());
      },
      error: () => this.loading.set(false),
    });

    this.agentService.getAll({ pageNumber: 1, pageSize: 1 }, true).subscribe({
      next: res => this.agentCount.set(res?.totalCount ?? 0),
      error: () => this.agentCount.set(null),
    });

    this.countryService.getAll({ pageNumber: 1, pageSize: 1 }).subscribe({
      next: res => this.countryCount.set(res?.totalCount ?? 0),
      error: () => this.countryCount.set(null),
    });

    this.currencyService.getAll({ pageNumber: 1, pageSize: 1 }).subscribe({
      next: res => this.currencyCount.set(res?.totalCount ?? 0),
      error: () => this.currencyCount.set(null),
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

  get total()      { return this.companies().length; }
  get active()     { return this.companies().filter(c => c.isActive).length; }
  get completed()  { return this.companies().filter(c => c.isCompleted).length; }
  get frozenCount(){ return this.companies().filter(c => c.isFrozen).length; }
}
