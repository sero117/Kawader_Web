import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompanyService } from '../../../core/services/company.service';
import { Company } from '../../../core/models/company.models';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [RouterLink],
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
        const items: Company[] = Array.isArray(raw)
          ? raw
          : (raw?.items ?? raw?.data ?? []);
        this.companies.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  get total()    { return this.companies().length; }
  get active()   { return this.companies().filter(c => c.isActive).length; }
  get completed(){ return this.companies().filter(c => c.isCompleted).length; }
}
