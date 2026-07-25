import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CompanyService } from '../../../core/services/company.service';
import { AgentService } from '../../../core/services/agent.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Company } from '../../../core/models/company.models';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './admin-overview.component.html',
})
export class AdminOverviewComponent implements OnInit {
  private readonly companyService = inject(CompanyService);
  private readonly agentService   = inject(AgentService);

  companies  = signal<Company[]>([]);
  loading    = signal(true);
  agentCount = signal<number | null>(null);

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

        // The list endpoint doesn't return companyName — backfill it for the
        // handful of rows actually shown here via the single-company endpoint.
        const recent = normalized.slice(0, 5);
        if (recent.length) {
          forkJoin(recent.map(c => this.companyService.getById(c.id).pipe(catchError(() => of(null))))).subscribe(results => {
            this.companies.update(list => list.map(c => {
              const idx = recent.findIndex(r => r.id === c.id);
              const d: any = idx >= 0 ? results[idx] : null;
              const data = d?.data ?? d;
              return data?.companyName ? { ...c, companyName: data.companyName } : c;
            }));
          });
        }
      },
      error: () => this.loading.set(false),
    });

    this.agentService.getAll({ pageNumber: 1, pageSize: 1 }, true).subscribe({
      next: res => this.agentCount.set(res?.totalCount ?? 0),
      error: () => this.agentCount.set(null),
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
