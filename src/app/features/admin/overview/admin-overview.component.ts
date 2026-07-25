import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CompanyService } from '../../../core/services/company.service';
import { AgentService } from '../../../core/services/agent.service';
import { CardService } from '../../../core/services/card.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
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

  companies   = signal<Company[]>([]);
  loading     = signal(true);
  agentCount  = signal<number | null>(null);
  cardCounts  = signal<StatusCounts | null>(null);
  subCounts   = signal<StatusCounts | null>(null);

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
