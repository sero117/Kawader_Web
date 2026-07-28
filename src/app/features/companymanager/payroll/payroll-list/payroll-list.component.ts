import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { UrlFilter } from '../../../../core/utils/url-filter';
import { PayrollService } from '../../../../core/services/payroll.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { PayrollRun, PayrollStatus, UncoveredEmployee } from '../../../../core/models/payroll.models';
import { Currency } from '../../../../core/models/currency.models';

function periodRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('periodStart')?.value;
  const end   = group.get('periodEnd')?.value;
  return start && end && end < start ? { periodRange: true } : null;
}

@Component({
  selector: 'app-payroll-list',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './payroll-list.component.html',
})
export class PayrollListComponent implements OnInit {
  private readonly payrollService  = inject(PayrollService);
  private readonly currencyService = inject(CurrencyService);
  private readonly snackbar        = inject(SnackbarService);
  private readonly fb              = inject(FormBuilder);
  private readonly router          = inject(Router);
  private readonly lang            = inject(LanguageService);

  myCurrencies = signal<Currency[]>([]);
  currencyLoadError = signal<string | null>(null);

  uncovered        = signal<UncoveredEmployee[]>([]);
  uncoveredGroups   = computed(() => {
    const groups = new Map<string, UncoveredEmployee[]>();
    for (const e of this.uncovered()) {
      const key = e.currencyCode;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    return Array.from(groups.entries()).map(([currencyCode, employees]) => ({ currencyCode, employees }));
  });
  uncoveredExpanded = signal(false);

  readonly STATUSES: PayrollStatus[] = ['Draft', 'Approved', 'Paid'];

  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    status:     '',
    pageNumber: 1,
    pageSize:   10,
  });

  runs       = signal<PayrollRun[]>([]);
  loading    = signal(true);
  hasMore    = signal(false);
  listError  = signal<string | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);

  showCreateModal = signal(false);
  showDeleteModal = signal(false);
  deleteTargetId  = signal<number | null>(null);

  createForm = this.fb.group({
    currencyId:  [null as number | null, [Validators.required]],
    periodStart: ['', [Validators.required]],
    periodEnd:   ['', [Validators.required]],
  }, { validators: periodRangeValidator });

  ngOnInit(): void {
    this.loadRuns();
    // Silent — /currencies/me returns an empty array (not an error) when the
    // Admin hasn't granted this company any currency yet; we show our own
    // friendly empty-state message for that instead of a blank dropdown.
    this.currencyService.getMe(true).subscribe({
      next: list => {
        this.myCurrencies.set(list ?? []);
        this.currencyLoadError.set(list?.length ? null : this.lang.t('errors.noCurrenciesGrantedForCompany'));
      },
      error: () => {
        this.myCurrencies.set([]);
        this.currencyLoadError.set(this.lang.t('errors.noCurrenciesGrantedForCompany'));
      },
    });
  }

  loadRuns(): void {
    this.loading.set(true);
    const { status, pageNumber, pageSize } = this.filter.value();
    this.payrollService.getAll({
      pageNumber,
      pageSize,
      status: (status || null) as PayrollStatus | null,
    }).subscribe({
      next: res => {
        this.listError.set(null);
        this.runs.set(res.items);
        this.hasMore.set(res.hasNextPage);
        this.loading.set(false);
        this.loadUncovered();
      },
      error: err => {
        this.loading.set(false);
        this.listError.set(this.apiErr(err, 'Failed to load payroll runs.'));
      },
    });
  }

  /** Uses the current run's period as a best-effort default range for the coverage
   *  check — falls back to the current calendar month when no runs exist yet. */
  loadUncovered(): void {
    const runs = this.runs();
    let periodStart: string;
    let periodEnd: string;
    if (runs.length > 0) {
      periodStart = runs[0].periodStart;
      periodEnd   = runs[0].periodEnd;
    } else {
      const now = new Date();
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
      periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().substring(0, 10);
    }
    this.payrollService.getUncovered({ periodStart, periodEnd }).subscribe({
      next: list => this.uncovered.set(list ?? []),
      error: () => this.uncovered.set([]),
    });
  }

  createRunForCurrency(currencyId: number): void {
    this.openCreate();
    this.createForm.patchValue({ currencyId });
  }

  onStatusFilterChange(value: string): void {
    this.filter.set({ status: value });
    this.loadRuns();
  }

  prevPage(): void {
    if (this.filter.value().pageNumber <= 1) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber - 1 });
    this.loadRuns();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber + 1 });
    this.loadRuns();
  }

  goToDetail(run: PayrollRun): void {
    this.router.navigate(['/dashboard/manager/payroll', run.id]);
  }

  openCreate(): void {
    this.createForm.reset({ currencyId: this.myCurrencies()[0]?.id ?? null });
    this.modalError.set(null);
    this.showCreateModal.set(true);
  }

  submitCreate(): void {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.createForm.value;
    this.payrollService.create({
      currencyId:     v.currencyId!,
      periodStart:    v.periodStart!,
      periodEnd:      v.periodEnd!,
      idempotencyKey: crypto.randomUUID(),
    }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res?.isSuccess === false) {
          this.snackbar.show(res.message || 'Failed to create payroll run.', 'error');
          return;
        }
        this.showCreateModal.set(false);
        // API may return flat {id} or wrapped {data:{id}} — handle both.
        const id: number | undefined = res?.data?.id ?? res?.id;
        if (id != null && !isNaN(id)) {
          this.router.navigate(['/dashboard/manager/payroll', id]);
        } else {
          this.loadRuns();
        }
      },
      error: err => {
        this.submitting.set(false);
        if (err?.status === 409) {
          this.snackbar.show(this.lang.t('manager.payroll.errSameCurrencyOverlap'), 'error');
          return;
        }
        if (err?.status === 412) {
          this.snackbar.show(this.lang.t('manager.payroll.errCurrencyNotAllowed'), 'error');
          return;
        }
        // Anything else: the global interceptor already shows it as a snackbar.
      },
    });
  }

  confirmDelete(id: number, event: Event): void {
    event.stopPropagation();
    this.deleteTargetId.set(id);
    this.showDeleteModal.set(true);
  }

  executeDelete(): void {
    const id = this.deleteTargetId();
    if (id === null) return;
    this.submitting.set(true);
    this.payrollService.delete(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeleteModal.set(false);
        this.runs.update(list => list.filter(r => r.id !== id));
      },
      error: () => { this.submitting.set(false); this.showDeleteModal.set(false); },
    });
  }

  formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
    switch (err?.status) {
      case 401: return 'Session expired.';
      case 403: return 'You do not have permission.';
      case 404: return 'Payroll run not found.';
      case 409: return 'This period overlaps an existing payroll run.';
      case 412: return 'This payroll run can no longer be modified.';
      case 500: return 'Server error. Please try again later.';
      default:  return fallback;
    }
  }
}
