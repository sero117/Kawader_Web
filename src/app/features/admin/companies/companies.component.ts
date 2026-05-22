import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';

function passwordComplexity(c: AbstractControl): ValidationErrors | null {
  const v: string = c.value ?? '';
  if (!v) return null;
  const ok = /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v);
  return ok ? null : { complexity: true };
}
import { CompanyService } from '../../../core/services/company.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  Company, CompanyType, CompanyTypeLabels, GetCompaniesParams,
} from '../../../core/models/company.models';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './companies.component.html',
})
export class CompaniesComponent implements OnInit {
  private readonly companyService = inject(CompanyService);
  private readonly authService    = inject(AuthService);
  private readonly fb             = inject(FormBuilder);
  private readonly lang           = inject(LanguageService);

  // ── Filter (synced with URL) ───────────────────────────────────────────────
  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    search:     '',
    pageNumber: 1,
    pageSize:   10,
  });

  // ── Table state ────────────────────────────────────────────────────────────
  companies = signal<Company[]>([]);
  loading   = signal(true);
  hasMore   = signal(false);

  // Expose companies directly — status comes from the list response itself
  companiesWithStatus = computed(() => this.companies());

  // ── Flash / error ──────────────────────────────────────────────────────────
  successMsg = signal<string | null>(null);
  listError  = signal<string | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);

  // ── Wizard state ───────────────────────────────────────────────────────────
  showWizard = signal(false);
  wizardStep = signal(1);

  private _managerToken = '';
  private _managerPhone = '';

  // ── View / Edit / Delete modals ────────────────────────────────────────────
  showViewModal   = signal(false);
  showEditModal   = signal(false);
  showDeleteModal = signal(false);
  selectedCompany = signal<Company | null>(null);
  viewLoading     = signal(false);
  deleteTargetId  = signal<number | null>(null);

  // ── Forms ──────────────────────────────────────────────────────────────────
  // 10 digits starting with 09
  private readonly phonePattern = /^09\d{8}$/;

  step1Form = this.fb.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(this.phonePattern)]],
    email:       ['', [Validators.email]],
  });

  step2Form = this.fb.group({
    managerPhone: ['', [Validators.required, Validators.pattern(this.phonePattern)]],
  });

  step3Form = this.fb.group({
    code:            ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    firstName:       ['', [Validators.required, Validators.maxLength(50)]],
    lastName:        ['', [Validators.required, Validators.maxLength(50)]],
    password:        ['', [Validators.required, Validators.minLength(8), passwordComplexity]],
    confirmPassword: ['', [Validators.required]],
  });

  step4Form = this.fb.group({
    companyName:   ['', [Validators.required, Validators.maxLength(200)]],
    address:       ['', [Validators.maxLength(500)]],
    landlinePhone: ['', [Validators.pattern(/^\d{7,10}$/)]],
    businessField: ['', [Validators.maxLength(200)]],
    companyType:   [CompanyType.Other as number, [Validators.required]],
  });

  selectedLogo: File | null = null;
  logoError    = signal<string | null>(null);

  editForm = this.fb.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(this.phonePattern)]],
    email:       ['', [Validators.email]],
  });

  readonly companyTypes = Object.values(CompanyType)
    .filter(v => typeof v === 'number')
    .map(v => ({ value: v as CompanyType, label: CompanyTypeLabels[v as CompanyType] }));

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void { this.loadCompanies(); }

  loadCompanies(): void {
    this.loading.set(true);

    const { search, pageNumber, pageSize } = this.filter.value();
    const query = search.trim();
    const params: GetCompaniesParams = { pageSize, pageNumber };
    if (query.includes('@')) params.email       = query;
    else if (query)          params.phoneNumber = query;

    this.companyService.getAll(params).subscribe({
      next: res => {
        this.listError.set(null);

        // Server returned isSuccess: false
        if ((res as any).isSuccess === false) {
          this.listError.set((res as any).message || 'Failed to load companies.');
          this.loading.set(false);
          return;
        }

        // Handle multiple possible response shapes:
        // 1. { isSuccess, data: Company[] }           ← standard ApiResponse
        // 2. { isSuccess, data: { items: Company[] } } ← paginated wrapper
        // 3. Company[]                                 ← raw array (no wrapper)
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
    this.filter.set({ search: value });   // pageNumber resets to 1 automatically
    this.loadCompanies();
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

  // ── Wizard ─────────────────────────────────────────────────────────────────
  openWizard(): void {
    this.step1Form.reset();
    this.step2Form.reset();
    this.step3Form.reset();
    this.step4Form.reset({ companyType: CompanyType.Other });
    this.selectedLogo = null;
    this._managerToken = '';
    this._managerPhone = '';
    this.wizardStep.set(1);
    this.modalError.set(null);
    this.showWizard.set(true);
  }

  closeWizard(): void { this.showWizard.set(false); }

  submitStep1(): void {
    if (this.step1Form.invalid) { this.step1Form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);

    const payload = {
      phoneNumber: this.step1Form.value.phoneNumber!,
      email:       this.step1Form.value.email || undefined,
      tenantId:    crypto.randomUUID(),
    };

    this.companyService.create(payload).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        // API returns { id: N } directly — not wrapped in ApiResponse
        const success = res?.isSuccess === true || res?.id != null || res?.data != null;
        if (success) {
          this.wizardStep.set(2);
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

  submitStep2(): void {
    if (this.step2Form.invalid) { this.step2Form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);

    const phone = this.step2Form.value.managerPhone!;
    this._managerPhone = phone;

    this.authService.generateCode({ phoneNumber: phone }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        // Only block if API explicitly returns isSuccess: false
        if (res?.isSuccess === false) {
          this.modalError.set(res.message || 'Failed to send verification code.');
          return;
        }
        // Auto-fill code if returned (dev/test env)
        const code = res?.data?.code ?? res?.code;
        if (code) this.step3Form.patchValue({ code });
        this.wizardStep.set(3);
      },
      error: err => {
        this.submitting.set(false);
        this.modalError.set(this.apiErr(err, 'Failed to send verification code.'));
      },
    });
  }

  submitStep3(): void {
    if (this.step3Form.invalid) { this.step3Form.markAllAsTouched(); return; }
    if (this.step3Form.value.password !== this.step3Form.value.confirmPassword) {
      this.modalError.set('Passwords do not match.');
      return;
    }
    this.submitting.set(true);
    this.modalError.set(null);

    const s3payload = {
      phoneNumber: this._managerPhone,
      code:        this.step3Form.value.code!,
      firstName:   this.step3Form.value.firstName!,
      lastName:    this.step3Form.value.lastName!,
      password:    this.step3Form.value.password!,
    };
    console.log('[Step3] payload →', s3payload);

    this.authService.completeCompanyInfo(s3payload).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        console.log('[Step3] response →', JSON.stringify(res));
        // Token may be nested under data or at root level
        const token: string =
          res?.data?.token       ??
          res?.data?.accessToken ??
          res?.token             ??
          res?.accessToken       ?? '';
        if (token) {
          this._managerToken = token;
          this.wizardStep.set(4);
        } else {
          this.modalError.set(res?.message ?? res?.data?.message ?? 'Failed to create manager account.');
        }
      },
      error: err => {
        this.submitting.set(false);
        console.log('[Step3] error →', err?.status, err?.error);
        this.modalError.set(this.apiErr(err, 'Failed to create manager account.'));
      },
    });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0] ?? null;
    this.logoError.set(null);

    if (file) {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) {
        this.logoError.set('Only JPG, PNG or WEBP allowed.');
        this.selectedLogo = null;
        input.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        this.logoError.set('Logo must be under 2 MB.');
        this.selectedLogo = null;
        input.value = '';
        return;
      }
    }
    this.selectedLogo = file;
  }

  submitStep4(): void {
    if (this.step4Form.invalid) { this.step4Form.markAllAsTouched(); return; }
    if (!this.selectedLogo) {
      this.modalError.set('Company logo is required.');
      return;
    }
    this.submitting.set(true);
    this.modalError.set(null);

    const fd = new FormData();
    fd.append('companyName', this.step4Form.value.companyName!);
    if (this.step4Form.value.address) fd.append('address', this.step4Form.value.address);
    fd.append('companyType', String(this.step4Form.value.companyType!));
    if (this.step4Form.value.landlinePhone) fd.append('landlinePhone', this.step4Form.value.landlinePhone);
    if (this.step4Form.value.businessField) fd.append('businessField', this.step4Form.value.businessField);
    fd.append('logo', this.selectedLogo);

    console.log('[Step4] token length:', this._managerToken?.length);
    console.log('[Step4] formData fields:', [...fd.keys()]);

    this.companyService.complete(fd, this._managerToken).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        console.log('[Step4] response →', JSON.stringify(res));
        // API returns { id: N } directly — same shape as Step 1
        if (res?.data != null || res?.isSuccess === true || res?.id != null) {
          this.showWizard.set(false);
          this.flash('Company added successfully!');
          this.filter.patch({ pageNumber: 1 });
          this.loadCompanies();
        } else {
          this.modalError.set(res?.message ?? 'Failed to complete company details.');
        }
      },
      error: err => {
        this.submitting.set(false);
        console.log('[Step4] error →', err?.status, JSON.stringify(err?.error));
        this.modalError.set(this.apiErr(err, 'Failed to complete company details.'));
      },
    });
  }

  // ── View (fetch fresh details on click) ────────────────────────────────────
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

    // Plain string body
    if (typeof body === 'string' && body.trim()) return body.trim();

    // Standard API response: { message | title | detail }
    for (const key of ['message', 'title', 'detail', 'error']) {
      const v = body[key];
      if (typeof v === 'string' && v.trim() && v.length < 400) return v.trim();
    }

    // Validation errors object: { errors: { Field: ["msg"] } }
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

    // HTTP status fallbacks
    switch (err?.status) {
      case 401: return 'Session expired. Please sign in again.';
      case 403: return 'You do not have permission for this action.';
      case 409: return 'This record already exists.';
      case 500: return 'Server error. Please try again later.';
      default:  return fallback;
    }
  }
}
