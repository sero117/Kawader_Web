import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { CompanyService } from '../../../core/services/company.service';
import { AgentService } from '../../../core/services/agent.service';
import { Agent } from '../../../core/models/agent.models';
import {
  Company, CompanyType, GetCompaniesParams,
} from '../../../core/models/company.models';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './companies.component.html',
})
export class CompaniesComponent implements OnInit {
  private readonly companyService = inject(CompanyService);
  private readonly agentService   = inject(AgentService);
  private readonly fb             = inject(FormBuilder);
  private readonly lang           = inject(LanguageService);

  agents = signal<Agent[]>([]);

  // ── Frozen IDs persisted in localStorage (API list doesn't return isFrozen) ─
  private readonly FROZEN_KEY = 'kawader_frozen_companies';
  private getFrozenIds(): Set<number> {
    try { return new Set(JSON.parse(localStorage.getItem(this.FROZEN_KEY) ?? '[]')); }
    catch { return new Set(); }
  }
  private saveFrozenId(id: number, frozen: boolean): void {
    const ids = this.getFrozenIds();
    frozen ? ids.add(id) : ids.delete(id);
    localStorage.setItem(this.FROZEN_KEY, JSON.stringify([...ids]));
  }

  // ── Filter (synced with URL) ───────────────────────────────────────────────
  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    search:      '',
    emailSearch: '',
    pageNumber:  1,
    pageSize:    10,
  });

  // ── Table state ────────────────────────────────────────────────────────────
  companies           = signal<Company[]>([]);
  loading             = signal(true);
  hasMore             = signal(false);
  frozenCount         = computed(() => this.companies().filter(c => c.isFrozen === true).length);
  companiesWithStatus = computed(() =>
    this.filter.filterItems(this.companies(), 'emailSearch', (c, term) =>
      (c.email?.toLowerCase() ?? '').includes(term) ||
      (c.companyName?.toLowerCase() ?? '').includes(term)
    )
  );

  // ── Flash / error ──────────────────────────────────────────────────────────
  successMsg = signal<string | null>(null);
  listError  = signal<string | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);

  // ── Add modal ──────────────────────────────────────────────────────────────
  showWizard = signal(false);

  private readonly phonePattern = /^09\d{8}$/;

  addForm = this.fb.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(this.phonePattern)]],
    email:       ['', [Validators.email]],
    agentId:     [null as number | null],
  });

  // ── View / Edit / Delete / Freeze modals ──────────────────────────────────
  showViewModal     = signal(false);
  showEditModal     = signal(false);
  showDeleteModal   = signal(false);
  showFreezeModal   = signal(false);
  showUnfreezeModal = signal(false);
  selectedCompany   = signal<Company | null>(null);
  viewLoading       = signal(false);
  deleteTargetId    = signal<number | null>(null);
  freezeTargetId    = signal<number | null>(null);

  editForm = this.fb.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(this.phonePattern)]],
    email:       ['', [Validators.email]],
    agentId:     [null as number | null],
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadCompanies();
    this.agentService.getAll({ pageNumber: 1, pageSize: 100 }, true).subscribe({
      next: res => this.agents.set(res.items ?? []),
      error: () => {},
    });
  }

  loadCompanies(): void {
    this.loading.set(true);

    const { search, pageNumber, pageSize } = this.filter.value();
    const params: GetCompaniesParams = { pageSize, pageNumber };
    if (search.trim()) params.phoneNumber = search.trim();

    this.companyService.getAll(params).subscribe({
      next: res => {
        this.listError.set(null);

        if ((res as any).isSuccess === false) {
          this.listError.set((res as any).message || 'Failed to load companies.');
          this.loading.set(false);
          return;
        }

        const raw = (res as any)?.data ?? res;
        const items: Company[] = Array.isArray(raw)
          ? raw
          : (raw?.items ?? raw?.data ?? raw?.companies ?? []);

        // Normalize PascalCase fields from .NET API + localStorage for frozen
        const frozenIds = this.getFrozenIds();
        const normalized = items.map((c: any) => ({
          ...c,
          isActive:    c.isActive    !== undefined ? c.isActive    : c.IsActive,
          isCompleted: c.isCompleted !== undefined ? c.isCompleted : c.IsCompleted,
          isFrozen: !!c.isFrozen || !!c.IsFrozen
            || (c.frozenAt != null && c.frozenAt !== '')
            || (c.FrozenAt != null && c.FrozenAt !== '')
            || frozenIds.has(c.id),
          agentId: c.agentId ?? c.AgentId ?? null,
        }));

        this.companies.set(normalized);
        this.hasMore.set(items.length >= this.filter.value().pageSize);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.listError.set(this.apiErr(err, 'Failed to load companies.'));
      },
    });
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  onSearch(value: string): void {
    this.filter.set({ search: value });
    this.loadCompanies();
  }

  onEmailSearch(value: string): void {
    this.filter.patch({ emailSearch: value });
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  prevPage(): void {
    if (this.filter.value().pageNumber <= 1) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber - 1 });
    this.loadCompanies();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber + 1 });
    this.loadCompanies();
  }

  // ── Add company modal ──────────────────────────────────────────────────────
  openWizard(): void {
    this.addForm.reset();
    this.modalError.set(null);
    this.showWizard.set(true);
  }

  closeWizard(): void { this.showWizard.set(false); }

  submitAdd(): void {
    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);

    this.companyService.create({
      phoneNumber:    this.addForm.value.phoneNumber!,
      email:          this.addForm.value.email || undefined,
      tenantId:       crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      agentId:        this.addForm.value.agentId || undefined,
    }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        // API returns { data: companyId }
        if (res?.data != null || res?.id != null || res?.isSuccess === true) {
          this.showWizard.set(false);
          this.flash('Company created successfully!');
          this.filter.patch({ pageNumber: 1 });
          this.loadCompanies();
        } else {
          this.modalError.set(res?.message || 'Failed to create company.');
        }
      },
      error: err => {
        this.submitting.set(false);
        this.modalError.set(this.apiErr(err, 'Failed to create company.'));
      },
    });
  }

  // ── View modal ─────────────────────────────────────────────────────────────
  viewCompany(company: Company): void {
    this.selectedCompany.set(company);
    this.showViewModal.set(true);
    this.viewLoading.set(true);

    this.companyService.getById(company.id).subscribe({
      next: res => {
        if (res.isSuccess && res.data) {
          const d: any = res.data;
          this.selectedCompany.set({
            ...d,
            isActive:    d.isActive    !== undefined ? d.isActive    : d.IsActive,
            isCompleted: d.isCompleted !== undefined ? d.isCompleted : d.IsCompleted,
            isFrozen: !!d.isFrozen || !!d.IsFrozen
              || (d.frozenAt != null && d.frozenAt !== '')
              || (d.FrozenAt != null && d.FrozenAt !== ''),
            agentId: d.agentId ?? d.AgentId ?? null,
          });
        }
        this.viewLoading.set(false);
      },
      error: () => this.viewLoading.set(false),
    });
  }

  // ── Edit modal ─────────────────────────────────────────────────────────────
  openEdit(company: Company, event: Event): void {
    event.stopPropagation();
    this.selectedCompany.set(company);
    this.editForm.patchValue({
      phoneNumber: company.phoneNumber,
      email:       company.email ?? '',
      agentId:     (company as any).agentId ?? null,
    });
    this.modalError.set(null);
    this.showEditModal.set(true);
  }

  submitEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const id = this.selectedCompany()?.id;
    if (!id) return;
    this.submitting.set(true);
    this.modalError.set(null);

    this.companyService.update(id, {
      phoneNumber: this.editForm.value.phoneNumber || undefined,
      email:       this.editForm.value.email       || undefined,
      agentId:     this.editForm.value.agentId      || undefined,
    }).subscribe({
      next: res => {
        this.submitting.set(false);
        if (res.isSuccess) {
          this.showEditModal.set(false);
          this.flash('Company updated.');
          this.loadCompanies();
        } else {
          this.modalError.set(res.message);
        }
      },
      error: err => {
        this.submitting.set(false);
        this.modalError.set(this.apiErr(err, 'Update failed.'));
      },
    });
  }

  // ── Freeze / Unfreeze ─────────────────────────────────────────────────────
  confirmFreeze(id: number, event: Event): void {
    event.stopPropagation();
    this.freezeTargetId.set(id);
    this.showFreezeModal.set(true);
  }

  confirmUnfreeze(id: number, event: Event): void {
    event.stopPropagation();
    this.freezeTargetId.set(id);
    this.showUnfreezeModal.set(true);
  }

  executeFreeze(): void {
    const id = this.freezeTargetId();
    if (id === null) return;
    this.submitting.set(true);
    this.companyService.freeze(id).subscribe({
      next: () => {
        this.saveFrozenId(id, true);
        this.submitting.set(false);
        this.showFreezeModal.set(false);
        this.companies.update(list => list.map(c => c.id === id ? { ...c, isFrozen: true } : c));
        this.flash('Company frozen.');
      },
      error: err => {
        this.submitting.set(false);
        if (err?.status === 400) {
          // 400 = already frozen → sync UI and persist
          this.saveFrozenId(id, true);
          this.companies.update(list => list.map(c => c.id === id ? { ...c, isFrozen: true } : c));
          this.showFreezeModal.set(false);
        } else {
          this.modalError.set(this.apiErr(err, 'Failed to freeze company.'));
        }
      },
    });
  }

  executeUnfreeze(): void {
    const id = this.freezeTargetId();
    if (id === null) return;
    this.submitting.set(true);
    this.companyService.unfreeze(id).subscribe({
      next: () => {
        this.saveFrozenId(id, false);
        this.submitting.set(false);
        this.showUnfreezeModal.set(false);
        this.companies.update(list => list.map(c => c.id === id ? { ...c, isFrozen: false } : c));
        this.flash('Company unfrozen.');
      },
      error: err => {
        this.submitting.set(false);
        this.modalError.set(this.apiErr(err, 'Failed to unfreeze company.'));
      },
    });
  }

  // ── Delete modal ───────────────────────────────────────────────────────────
  confirmDelete(id: number, event: Event): void {
    event.stopPropagation();
    this.deleteTargetId.set(id);
    this.showDeleteModal.set(true);
  }

  executeDelete(): void {
    const id = this.deleteTargetId();
    if (id === null) return;
    this.submitting.set(true);
    this.companyService.delete(id).subscribe({
      next: res => {
        this.submitting.set(false);
        this.showDeleteModal.set(false);
        if (res.isSuccess) {
          this.companies.update(list => list.filter(c => c.id !== id));
          this.flash('Company deleted.');
        }
      },
      error: () => { this.submitting.set(false); this.showDeleteModal.set(false); },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  companyTypeLabel(type?: CompanyType): string {
    return type !== undefined ? this.lang.t(`companyTypes.${type}`) : '—';
  }

  agentName(agentId?: number | null): string | null {
    if (!agentId) return null;
    const a = this.agents().find(ag => ag.id === agentId);
    return a ? `${a.firstName} ${a.lastName}` : null;
  }

  statusLabel(c: Company): { text: string; active: boolean; pending: boolean; frozen: boolean } {
    if (c.isFrozen)              return { text: 'Frozen',        active: false, pending: false, frozen: true  };
    if (c.isCompleted === false) return { text: 'Setup Pending', active: false, pending: true,  frozen: false };
    if (c.isActive === true)     return { text: 'Active',        active: true,  pending: false, frozen: false };
    if (c.isActive === false)    return { text: 'Inactive',      active: false, pending: false, frozen: false };
    return { text: 'Unknown', active: false, pending: false, frozen: false };
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private flash(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3500);
  }

  apiErr(err: any, fallback: string): string {
    if (err?.status === 0) return 'Cannot connect to server.';
    const body = err?.error;
    if (!body) return fallback;
    if (typeof body === 'string' && body.trim()) return body.trim();
    for (const key of ['message', 'title', 'detail', 'error']) {
      const v = body[key];
      if (typeof v === 'string' && v.trim() && v.length < 400) return v.trim();
    }
    if (body.errors) {
      if (Array.isArray(body.errors)) {
        const m = body.errors.map((e: any) => e?.message ?? e).filter((s: any) => typeof s === 'string').join('. ');
        if (m) return m;
      } else if (typeof body.errors === 'object') {
        const m = (Object.values(body.errors) as unknown[]).flat()
          .filter((s): s is string => typeof s === 'string').join('. ');
        if (m) return m;
      }
    }
    switch (err?.status) {
      case 401: return 'Session expired. Please sign in again.';
      case 403: return 'You do not have permission for this action.';
      case 409: return 'This record already exists.';
      case 500: return 'Server error. Please try again later.';
      default:  return fallback;
    }
  }
}
