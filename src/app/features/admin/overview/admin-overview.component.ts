import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompanyService } from '../../../core/services/company.service';
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

  companies  = signal<Company[]>([]);
  loading    = signal(true);

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
