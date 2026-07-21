import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { AgentService } from '../../../core/services/agent.service';
import { ReferredCompany } from '../../../core/models/agent.models';

@Component({
  selector: 'app-referred-companies',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './referred-companies.component.html',
})
export class ReferredCompaniesComponent implements OnInit {
  private readonly agentService = inject(AgentService);
  private readonly lang         = inject(LanguageService);

  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    pageNumber: 1,
    pageSize:   10,
  });

  companies = signal<ReferredCompany[]>([]);
  loading   = signal(true);
  listError = signal<string | null>(null);
  hasMore   = signal(false);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    const { pageNumber, pageSize } = this.filter.value();
    this.agentService.getMyCompanies({ pageNumber, pageSize }).subscribe({
      next: res => {
        this.companies.set(res.items ?? []);
        this.hasMore.set(pageNumber * pageSize < res.totalCount);
        this.loading.set(false);
        this.listError.set(null);
      },
      error: (err: any) => { this.loading.set(false); this.listError.set(this.apiErr(err)); },
    });
  }

  prevPage(): void {
    if (this.filter.value().pageNumber <= 1) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber - 1 });
    this.load();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber + 1 });
    this.load();
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  apiErr(err: any): string {
    if (err?.status === 0) return this.lang.t('errors.unexpected');
    const b = err?.error;
    if (!b) return this.lang.t('errors.unexpected');
    if (typeof b === 'string' && b.trim()) return b.trim();
    for (const k of ['title', 'message', 'detail']) { if (typeof b[k] === 'string' && b[k].trim()) return b[k]; }
    return this.lang.t('errors.unexpected');
  }
}
