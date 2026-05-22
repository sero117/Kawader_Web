import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { CompanyService } from '../../../core/services/company.service';
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
  private readonly fb             = inject(FormBuilder);
  private readonly lang           = inject(LanguageService);

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
  });

  // ── View / Edit / Delete modals ────────────────────────────────────────────
  showViewModal   = signal(false);
  showEditModal   = signal(false);
  showDeleteModal = signal(false);
  selectedCompany = signal<Company | null>(null);
  viewLoading     = signal(false);
  deleteTargetId  = signal<number | null>(null);

  editForm = this.fb.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(this.phonePattern)]],
    email:       ['', [Validators.email]],
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void { this.loadCompanies(); }

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

        this.companies.set(items);
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
      phoneNumber: this.addForm.value.phoneNumber!,
      email:       this.addForm.value.email || undefined,
      tenantId:    crypto.randomUUID(),
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
        if (res.isSuccess && res.data) this.selectedCompany.set(res.data);
        this.viewLoading.set(false);
      },
      error: () => this.viewLoading.set(false),
    });
  }

  // ── Edit modal ─────────────────────────────────────────────────────────────
  openEdit(company: Company, event: Event): void {
    event.stopPropagation();
    this.selectedCompany.set(company);
    this.editForm.patchValue({ phoneNumber: company.phoneNumber, email: company.email ?? '' });
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

  statusLabel(c: Company): { text: string; active: boolean; pending: boolean } {
    if (c.isCompleted === false) return { text: 'Setup Pending', active: false, pending: true };
    if (c.isActive === true)     return { text: 'Active',        active: true,  pending: false };
    if (c.isActive === false)    return { text: 'Inactive',      active: false, pending: false };
    return { text: 'Unknown', active: false, pending: false };
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
