import { Component, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.models';
import { IncentiveService } from '../../../core/services/incentive.service';
import { DeductionService } from '../../../core/services/deduction.service';
import {
  Incentive, IncentiveType, GetIncentivesParams,
} from '../../../core/models/incentive.models';
import {
  Deduction, DeductionType, GetDeductionsParams,
} from '../../../core/models/deduction.models';

type Tab = 'incentives' | 'deductions';

interface DateFilter {
  fromDate: string;
  toDate: string;
  pageNumber: number;
  pageSize: number;
}

@Component({
  selector: 'app-incentives-deductions',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './incentives-deductions.component.html',
})
export class IncentivesDeductionsComponent implements OnInit {
  private readonly employeeService  = inject(EmployeeService);
  private readonly incentiveService = inject(IncentiveService);
  private readonly deductionService = inject(DeductionService);
  private readonly fb               = inject(FormBuilder);
  private readonly lang             = inject(LanguageService);

  private readonly PAGE_SIZE = 10;

  readonly IncentiveType = IncentiveType;
  readonly DeductionType = DeductionType;
  readonly incentiveTypeList = [IncentiveType.Performance, IncentiveType.Bonus];
  readonly deductionTypeList = [DeductionType.Late, DeductionType.Absence, DeductionType.Advance];

  // ── Employee selection ──────────────────────────────────────────────────────
  allEmployees       = signal<Employee[]>([]);
  selectedEmployeeId = signal<number | null>(null);
  activeTab          = signal<Tab>('incentives');

  // ── Incentives tab state ─────────────────────────────────────────────────────
  incentives           = signal<Incentive[]>([]);
  incentivesLoading    = signal(false);
  incentivesListError  = signal<string | null>(null);
  incentivesHasMore    = signal(false);
  incentivesFilter     = signal<DateFilter & { type: IncentiveType | null }>({
    fromDate: '', toDate: '', type: null, pageNumber: 1, pageSize: this.PAGE_SIZE,
  });
  incentivesFilterErr  = signal<string | null>(null);

  // ── Deductions tab state ─────────────────────────────────────────────────────
  deductions           = signal<Deduction[]>([]);
  deductionsLoading    = signal(false);
  deductionsListError  = signal<string | null>(null);
  deductionsHasMore    = signal(false);
  deductionsFilter     = signal<DateFilter & { type: DeductionType | null }>({
    fromDate: '', toDate: '', type: null, pageNumber: 1, pageSize: this.PAGE_SIZE,
  });
  deductionsFilterErr  = signal<string | null>(null);

  // ── Flash / modal shared state ───────────────────────────────────────────────
  successMsg = signal<string | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);

  // ── Incentive modals ─────────────────────────────────────────────────────────
  showIncentiveAddModal    = signal(false);
  showIncentiveEditModal   = signal(false);
  showIncentiveDeleteModal = signal(false);
  selectedIncentive        = signal<Incentive | null>(null);
  deleteIncentiveTarget    = signal<number | null>(null);

  // ── Deduction modals ──────────────────────────────────────────────────────────
  showDeductionAddModal    = signal(false);
  showDeductionEditModal   = signal(false);
  showDeductionDeleteModal = signal(false);
  selectedDeduction        = signal<Deduction | null>(null);
  deleteDeductionTarget    = signal<number | null>(null);

  // ── Forms ─────────────────────────────────────────────────────────────────────
  incentiveForm = this.fb.group({
    incentiveType: [null as IncentiveType | null, [Validators.required]],
    amount:        [null as number | null, [Validators.required, positiveAmountValidator]],
    date:          ['', [Validators.required]],
    reason:        ['', [Validators.maxLength(500)]],
  });

  deductionForm = this.fb.group({
    deductionType: [null as DeductionType | null, [Validators.required]],
    amount:        [null as number | null, [Validators.required, positiveAmountValidator]],
    date:          ['', [Validators.required]],
    reason:        ['', [Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    this.loadEmployees();
  }

  private loadEmployees(): void {
    this.employeeService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res: any) => {
        const raw  = res?.data ?? res;
        const list: Employee[] = Array.isArray(raw)
          ? raw
          : (raw?.items ?? raw?.data ?? raw?.employees ?? []);
        this.allEmployees.set(list);
      },
      error: () => {},
    });
  }

  // ── Employee / tab switching ─────────────────────────────────────────────────
  onEmployeeChange(id: string): void {
    const empId = id ? Number(id) : null;
    this.selectedEmployeeId.set(empId);
    this.incentives.set([]);
    this.deductions.set([]);
    this.incentivesListError.set(null);
    this.deductionsListError.set(null);
    if (!empId) return;
    if (this.activeTab() === 'incentives') this.loadIncentives();
    else this.loadDeductions();
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (!this.selectedEmployeeId()) return;
    if (tab === 'incentives') this.loadIncentives();
    else this.loadDeductions();
  }

  // ── Incentives: load / filter / paginate ─────────────────────────────────────
  loadIncentives(): void {
    const empId = this.selectedEmployeeId();
    if (!empId) return;
    const f = this.incentivesFilter();
    if (f.fromDate && f.toDate && f.toDate < f.fromDate) {
      this.incentivesFilterErr.set(this.lang.t('manager.incentivesDeductions.dateRangeError'));
      return;
    }
    this.incentivesFilterErr.set(null);
    this.incentivesLoading.set(true);
    const params: GetIncentivesParams = { pageNumber: f.pageNumber, pageSize: f.pageSize };
    if (f.fromDate) params.fromDate = f.fromDate;
    if (f.toDate)   params.toDate   = f.toDate;
    if (f.type !== null) params.type = f.type;

    this.incentiveService.getAll(empId, params).subscribe({
      next: (res: any) => {
        this.incentivesListError.set(null);
        const raw   = res?.data ?? res;
        const items: Incentive[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const total = raw?.totalCount ?? items.length;
        this.incentives.set(items);
        this.incentivesHasMore.set(f.pageNumber * f.pageSize < total);
        this.incentivesLoading.set(false);
      },
      error: err => {
        this.incentivesLoading.set(false);
        this.incentivesListError.set(this.apiErr(err, 'Failed to load incentives.'));
      },
    });
  }

  applyIncentiveFilter(): void {
    this.incentivesFilter.update(f => ({ ...f, pageNumber: 1 }));
    this.loadIncentives();
  }

  patchIncentiveFilter(patch: Partial<DateFilter & { type: IncentiveType | null }>): void {
    this.incentivesFilter.update(f => ({ ...f, ...patch }));
  }

  onIncentiveTypeFilterChange(value: string): void {
    this.patchIncentiveFilter({ type: value === '' ? null : (Number(value) as IncentiveType) });
  }

  prevIncentivePage(): void {
    if (this.incentivesFilter().pageNumber <= 1) return;
    this.incentivesFilter.update(f => ({ ...f, pageNumber: f.pageNumber - 1 }));
    this.loadIncentives();
  }

  nextIncentivePage(): void {
    if (!this.incentivesHasMore()) return;
    this.incentivesFilter.update(f => ({ ...f, pageNumber: f.pageNumber + 1 }));
    this.loadIncentives();
  }

  // ── Deductions: load / filter / paginate ─────────────────────────────────────
  loadDeductions(): void {
    const empId = this.selectedEmployeeId();
    if (!empId) return;
    const f = this.deductionsFilter();
    if (f.fromDate && f.toDate && f.toDate < f.fromDate) {
      this.deductionsFilterErr.set(this.lang.t('manager.incentivesDeductions.dateRangeError'));
      return;
    }
    this.deductionsFilterErr.set(null);
    this.deductionsLoading.set(true);
    const params: GetDeductionsParams = { pageNumber: f.pageNumber, pageSize: f.pageSize };
    if (f.fromDate) params.fromDate = f.fromDate;
    if (f.toDate)   params.toDate   = f.toDate;
    if (f.type !== null) params.type = f.type;

    this.deductionService.getAll(empId, params).subscribe({
      next: (res: any) => {
        this.deductionsListError.set(null);
        const raw   = res?.data ?? res;
        const items: Deduction[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const total = raw?.totalCount ?? items.length;
        this.deductions.set(items);
        this.deductionsHasMore.set(f.pageNumber * f.pageSize < total);
        this.deductionsLoading.set(false);
      },
      error: err => {
        this.deductionsLoading.set(false);
        this.deductionsListError.set(this.apiErr(err, 'Failed to load deductions.'));
      },
    });
  }

  applyDeductionFilter(): void {
    this.deductionsFilter.update(f => ({ ...f, pageNumber: 1 }));
    this.loadDeductions();
  }

  patchDeductionFilter(patch: Partial<DateFilter & { type: DeductionType | null }>): void {
    this.deductionsFilter.update(f => ({ ...f, ...patch }));
  }

  onDeductionTypeFilterChange(value: string): void {
    this.patchDeductionFilter({ type: value === '' ? null : (Number(value) as DeductionType) });
  }

  prevDeductionPage(): void {
    if (this.deductionsFilter().pageNumber <= 1) return;
    this.deductionsFilter.update(f => ({ ...f, pageNumber: f.pageNumber - 1 }));
    this.loadDeductions();
  }

  nextDeductionPage(): void {
    if (!this.deductionsHasMore()) return;
    this.deductionsFilter.update(f => ({ ...f, pageNumber: f.pageNumber + 1 }));
    this.loadDeductions();
  }

  // ── Incentive: Add ───────────────────────────────────────────────────────────
  openAddIncentive(): void {
    if (!this.selectedEmployeeId()) return;
    this.incentiveForm.reset();
    this.modalError.set(null);
    this.showIncentiveAddModal.set(true);
  }

  submitAddIncentive(): void {
    if (this.incentiveForm.invalid) { this.incentiveForm.markAllAsTouched(); return; }
    const empId = this.selectedEmployeeId();
    if (!empId) return;
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.incentiveForm.value;
    this.incentiveService.create(empId, {
      incentiveType:  v.incentiveType!,
      amount:         Number(v.amount),
      date:           v.date!,
      reason:         v.reason || null,
      idempotencyKey: crypto.randomUUID(),
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showIncentiveAddModal.set(false);
        this.flash(this.lang.t('manager.incentivesDeductions.incentiveAdded'));
        this.incentivesFilter.update(f => ({ ...f, pageNumber: 1 }));
        this.loadIncentives();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to add incentive.')); },
    });
  }

  // ── Incentive: Edit ──────────────────────────────────────────────────────────
  openEditIncentive(inc: Incentive, event: Event): void {
    event.stopPropagation();
    this.selectedIncentive.set(inc);
    this.incentiveForm.patchValue({
      incentiveType: inc.incentiveType,
      amount:        inc.amount,
      date:          inc.date,
      reason:        inc.reason ?? '',
    });
    this.modalError.set(null);
    this.showIncentiveEditModal.set(true);
  }

  submitEditIncentive(): void {
    if (this.incentiveForm.invalid) { this.incentiveForm.markAllAsTouched(); return; }
    const empId = this.selectedEmployeeId();
    const inc   = this.selectedIncentive();
    if (!empId || !inc) return;
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.incentiveForm.value;
    this.incentiveService.update(empId, inc.id, {
      incentiveType: v.incentiveType!,
      amount:        Number(v.amount),
      date:          v.date!,
      reason:        v.reason || null,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showIncentiveEditModal.set(false);
        this.flash(this.lang.t('manager.incentivesDeductions.incentiveUpdated'));
        this.loadIncentives();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to update incentive.')); },
    });
  }

  // ── Incentive: Delete ────────────────────────────────────────────────────────
  confirmDeleteIncentive(inc: Incentive, event: Event): void {
    event.stopPropagation();
    this.deleteIncentiveTarget.set(inc.id);
    this.showIncentiveDeleteModal.set(true);
  }

  executeDeleteIncentive(): void {
    const empId = this.selectedEmployeeId();
    const id    = this.deleteIncentiveTarget();
    if (!empId || !id) return;
    this.submitting.set(true);
    this.incentiveService.delete(empId, id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showIncentiveDeleteModal.set(false);
        this.incentives.update(list => list.filter(i => i.id !== id));
        this.flash(this.lang.t('manager.incentivesDeductions.incentiveDeleted'));
      },
      error: () => { this.submitting.set(false); this.showIncentiveDeleteModal.set(false); },
    });
  }

  // ── Deduction: Add ───────────────────────────────────────────────────────────
  openAddDeduction(): void {
    if (!this.selectedEmployeeId()) return;
    this.deductionForm.reset();
    this.modalError.set(null);
    this.showDeductionAddModal.set(true);
  }

  submitAddDeduction(): void {
    if (this.deductionForm.invalid) { this.deductionForm.markAllAsTouched(); return; }
    const empId = this.selectedEmployeeId();
    if (!empId) return;
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.deductionForm.value;
    this.deductionService.create(empId, {
      deductionType:  v.deductionType!,
      amount:         Number(v.amount),
      date:           v.date!,
      reason:         v.reason || null,
      idempotencyKey: crypto.randomUUID(),
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeductionAddModal.set(false);
        this.flash(this.lang.t('manager.incentivesDeductions.deductionAdded'));
        this.deductionsFilter.update(f => ({ ...f, pageNumber: 1 }));
        this.loadDeductions();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to add deduction.')); },
    });
  }

  // ── Deduction: Edit ──────────────────────────────────────────────────────────
  openEditDeduction(ded: Deduction, event: Event): void {
    event.stopPropagation();
    this.selectedDeduction.set(ded);
    this.deductionForm.patchValue({
      deductionType: ded.deductionType,
      amount:        ded.amount,
      date:          ded.date,
      reason:        ded.reason ?? '',
    });
    this.modalError.set(null);
    this.showDeductionEditModal.set(true);
  }

  submitEditDeduction(): void {
    if (this.deductionForm.invalid) { this.deductionForm.markAllAsTouched(); return; }
    const empId = this.selectedEmployeeId();
    const ded   = this.selectedDeduction();
    if (!empId || !ded) return;
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.deductionForm.value;
    this.deductionService.update(empId, ded.id, {
      deductionType: v.deductionType!,
      amount:        Number(v.amount),
      date:          v.date!,
      reason:        v.reason || null,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeductionEditModal.set(false);
        this.flash(this.lang.t('manager.incentivesDeductions.deductionUpdated'));
        this.loadDeductions();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to update deduction.')); },
    });
  }

  // ── Deduction: Delete ────────────────────────────────────────────────────────
  confirmDeleteDeduction(ded: Deduction, event: Event): void {
    event.stopPropagation();
    this.deleteDeductionTarget.set(ded.id);
    this.showDeductionDeleteModal.set(true);
  }

  executeDeleteDeduction(): void {
    const empId = this.selectedEmployeeId();
    const id    = this.deleteDeductionTarget();
    if (!empId || !id) return;
    this.submitting.set(true);
    this.deductionService.delete(empId, id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeductionDeleteModal.set(false);
        this.deductions.update(list => list.filter(d => d.id !== id));
        this.flash(this.lang.t('manager.incentivesDeductions.deductionDeleted'));
      },
      error: () => { this.submitting.set(false); this.showDeductionDeleteModal.set(false); },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  incentiveTypeLabel(t: IncentiveType): string {
    return this.lang.t(`manager.incentiveTypes.${t}`);
  }

  deductionTypeLabel(t: DeductionType): string {
    return this.lang.t(`manager.deductionTypes.${t}`);
  }

  formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatAmount(a: number): string {
    return a.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    switch (err?.status) {
      case 401: return 'Session expired.';
      case 403: return 'Permission denied.';
      case 404: return 'Record not found.';
      case 400: return 'Invalid data submitted.';
      case 500: return 'Server error. Please try again.';
      default:  return fallback;
    }
  }
}

function positiveAmountValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  if (v === null || v === undefined || v === '') return null;
  return Number(v) > 0 ? null : { positiveAmount: true };
}
