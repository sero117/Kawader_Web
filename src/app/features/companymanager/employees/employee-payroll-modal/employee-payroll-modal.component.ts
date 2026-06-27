import { Component, signal, inject, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { Employee } from '../../../../core/models/employee.models';
import { IncentiveService } from '../../../../core/services/incentive.service';
import { DeductionService } from '../../../../core/services/deduction.service';
import { EmployeeLeaveService } from '../../../../core/services/employee-leave.service';
import { LeaveBalanceService } from '../../../../core/services/leave-balance.service';
import {
  Incentive, IncentiveType, GetIncentivesParams,
} from '../../../../core/models/incentive.models';
import {
  Deduction, DeductionType, GetDeductionsParams,
} from '../../../../core/models/deduction.models';
import {
  EmployeeLeave, GetEmployeeLeavesParams,
} from '../../../../core/models/employee-leave.models';
import {
  EmployeeLeaveBalance,
} from '../../../../core/models/leave-balance.models';

type Tab = 'incentives' | 'deductions' | 'leaves' | 'balance';

interface DateFilter {
  fromDate: string;
  toDate: string;
  pageNumber: number;
  pageSize: number;
}

@Component({
  selector: 'app-employee-payroll-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './employee-payroll-modal.component.html',
})
export class EmployeePayrollModalComponent implements OnInit {
  @Input({ required: true }) employee!: Employee;
  @Output() closed = new EventEmitter<void>();

  private readonly incentiveService     = inject(IncentiveService);
  private readonly deductionService    = inject(DeductionService);
  private readonly employeeLeaveService = inject(EmployeeLeaveService);
  private readonly leaveBalanceService  = inject(LeaveBalanceService);
  private readonly fb                  = inject(FormBuilder);
  private readonly lang                = inject(LanguageService);

  private readonly PAGE_SIZE = 10;

  readonly IncentiveType = IncentiveType;
  readonly DeductionType = DeductionType;
  readonly incentiveTypeList = [IncentiveType.Performance, IncentiveType.Bonus];
  readonly deductionTypeList = [DeductionType.Late, DeductionType.Absence, DeductionType.Advance];

  activeTab = signal<Tab>('incentives');

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

  // ── Leaves tab state ──────────────────────────────────────────────────────────
  leaves           = signal<EmployeeLeave[]>([]);
  leavesLoading    = signal(false);
  leavesListError  = signal<string | null>(null);
  leavesHasMore    = signal(false);
  leavesFilter     = signal<DateFilter & { isPaid: boolean | null }>({
    fromDate: '', toDate: '', isPaid: null, pageNumber: 1, pageSize: this.PAGE_SIZE,
  });
  leavesFilterErr  = signal<string | null>(null);

  showLeaveAddModal    = signal(false);
  showLeaveEditModal   = signal(false);
  showLeaveDeleteModal = signal(false);
  selectedLeave        = signal<EmployeeLeave | null>(null);
  deleteLeaveTarget    = signal<number | null>(null);

  leaveForm = this.fb.group({
    startDate: ['', [Validators.required]],
    endDate:   ['', [Validators.required]],
    isPaid:    [true, [Validators.required]],
    notes:     ['', [Validators.maxLength(500)]],
  }, { validators: dateRangeValidator });

  // ── Leave balance tab state ──────────────────────────────────────────────────
  balanceYear    = signal(new Date().getFullYear());
  balance        = signal<EmployeeLeaveBalance | null>(null);
  balanceLoading = signal(false);
  balanceError   = signal<string | null>(null);
  balanceNotFound = signal(false);

  showBalanceAddModal    = signal(false);
  showBalanceEditModal   = signal(false);
  showBalanceDeleteModal = signal(false);
  showCarryOverModal     = signal(false);

  balanceAddForm = this.fb.group({
    totalDays: [21, [Validators.required, Validators.min(0)]],
  });

  balanceEditForm = this.fb.group({
    totalDays: [0, [Validators.required, Validators.min(0)]],
  });

  carryOverForm = this.fb.group({
    fromYear: [new Date().getFullYear() - 1, [Validators.required]],
    toYear:   [new Date().getFullYear(), [Validators.required]],
  });

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
    this.loadIncentives();
  }

  close(): void {
    this.closed.emit();
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (tab === 'incentives' && this.incentives().length === 0 && !this.incentivesListError()) this.loadIncentives();
    if (tab === 'deductions' && this.deductions().length === 0 && !this.deductionsListError()) this.loadDeductions();
    if (tab === 'leaves' && this.leaves().length === 0 && !this.leavesListError()) this.loadLeaves();
    if (tab === 'balance' && !this.balance() && !this.balanceNotFound() && !this.balanceError()) this.loadBalance();
  }

  // ── Incentives: load / filter / paginate ─────────────────────────────────────
  loadIncentives(): void {
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

    this.incentiveService.getAll(this.employee.id, params).subscribe({
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

    this.deductionService.getAll(this.employee.id, params).subscribe({
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
    this.incentiveForm.reset();
    this.modalError.set(null);
    this.showIncentiveAddModal.set(true);
  }

  submitAddIncentive(): void {
    if (this.incentiveForm.invalid) { this.incentiveForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.incentiveForm.value;
    this.incentiveService.create(this.employee.id, {
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
    const inc = this.selectedIncentive();
    if (!inc) return;
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.incentiveForm.value;
    this.incentiveService.update(this.employee.id, inc.id, {
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
    const id = this.deleteIncentiveTarget();
    if (!id) return;
    this.submitting.set(true);
    this.incentiveService.delete(this.employee.id, id).subscribe({
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
    this.deductionForm.reset();
    this.modalError.set(null);
    this.showDeductionAddModal.set(true);
  }

  submitAddDeduction(): void {
    if (this.deductionForm.invalid) { this.deductionForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.deductionForm.value;
    this.deductionService.create(this.employee.id, {
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
    const ded = this.selectedDeduction();
    if (!ded) return;
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.deductionForm.value;
    this.deductionService.update(this.employee.id, ded.id, {
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
    const id = this.deleteDeductionTarget();
    if (!id) return;
    this.submitting.set(true);
    this.deductionService.delete(this.employee.id, id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeductionDeleteModal.set(false);
        this.deductions.update(list => list.filter(d => d.id !== id));
        this.flash(this.lang.t('manager.incentivesDeductions.deductionDeleted'));
      },
      error: () => { this.submitting.set(false); this.showDeductionDeleteModal.set(false); },
    });
  }

  // ── Leaves: load / filter / paginate ─────────────────────────────────────────
  loadLeaves(): void {
    const f = this.leavesFilter();
    if (f.fromDate && f.toDate && f.toDate < f.fromDate) {
      this.leavesFilterErr.set(this.lang.t('manager.incentivesDeductions.dateRangeError'));
      return;
    }
    this.leavesFilterErr.set(null);
    this.leavesLoading.set(true);
    const params: GetEmployeeLeavesParams = { pageNumber: f.pageNumber, pageSize: f.pageSize };
    if (f.fromDate) params.fromDate = f.fromDate;
    if (f.toDate)   params.toDate   = f.toDate;
    if (f.isPaid !== null) params.isPaid = f.isPaid;

    this.employeeLeaveService.getAll(this.employee.id, params).subscribe({
      next: (res: any) => {
        this.leavesListError.set(null);
        const raw   = res?.data ?? res;
        const items: EmployeeLeave[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const total = raw?.totalCount ?? items.length;
        this.leaves.set(items);
        this.leavesHasMore.set(f.pageNumber * f.pageSize < total);
        this.leavesLoading.set(false);
      },
      error: err => {
        this.leavesLoading.set(false);
        this.leavesListError.set(this.apiErr(err, 'Failed to load leaves.'));
      },
    });
  }

  applyLeaveFilter(): void {
    this.leavesFilter.update(f => ({ ...f, pageNumber: 1 }));
    this.loadLeaves();
  }

  patchLeaveFilter(patch: Partial<DateFilter & { isPaid: boolean | null }>): void {
    this.leavesFilter.update(f => ({ ...f, ...patch }));
  }

  onLeaveIsPaidFilterChange(value: string): void {
    this.patchLeaveFilter({ isPaid: value === '' ? null : value === 'true' });
  }

  prevLeavePage(): void {
    if (this.leavesFilter().pageNumber <= 1) return;
    this.leavesFilter.update(f => ({ ...f, pageNumber: f.pageNumber - 1 }));
    this.loadLeaves();
  }

  nextLeavePage(): void {
    if (!this.leavesHasMore()) return;
    this.leavesFilter.update(f => ({ ...f, pageNumber: f.pageNumber + 1 }));
    this.loadLeaves();
  }

  // ── Leave: Add ────────────────────────────────────────────────────────────────
  openAddLeave(): void {
    this.leaveForm.reset({ isPaid: true });
    this.modalError.set(null);
    this.showLeaveAddModal.set(true);
  }

  submitAddLeave(): void {
    if (this.leaveForm.invalid) { this.leaveForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.leaveForm.value;
    this.employeeLeaveService.create(this.employee.id, {
      startDate:      v.startDate!,
      endDate:        v.endDate!,
      isPaid:         v.isPaid!,
      notes:          v.notes || null,
      idempotencyKey: crypto.randomUUID(),
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showLeaveAddModal.set(false);
        this.flash(this.lang.t('manager.leaves.added'));
        this.leavesFilter.update(f => ({ ...f, pageNumber: 1 }));
        this.loadLeaves();
        this.balance.set(null);
        this.balanceNotFound.set(false);
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to add leave.')); },
    });
  }

  // ── Leave: Edit ───────────────────────────────────────────────────────────────
  openEditLeave(leave: EmployeeLeave, event: Event): void {
    event.stopPropagation();
    this.selectedLeave.set(leave);
    this.leaveForm.patchValue({
      startDate: leave.startDate,
      endDate:   leave.endDate,
      isPaid:    leave.isPaid,
      notes:     leave.notes ?? '',
    });
    this.modalError.set(null);
    this.showLeaveEditModal.set(true);
  }

  submitEditLeave(): void {
    if (this.leaveForm.invalid) { this.leaveForm.markAllAsTouched(); return; }
    const leave = this.selectedLeave();
    if (!leave) return;
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.leaveForm.value;
    this.employeeLeaveService.update(this.employee.id, leave.id, {
      startDate: v.startDate!,
      endDate:   v.endDate!,
      isPaid:    v.isPaid!,
      notes:     v.notes || null,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showLeaveEditModal.set(false);
        this.flash(this.lang.t('manager.leaves.updated'));
        this.loadLeaves();
        this.balance.set(null);
        this.balanceNotFound.set(false);
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to update leave.')); },
    });
  }

  // ── Leave: Delete ─────────────────────────────────────────────────────────────
  confirmDeleteLeave(leave: EmployeeLeave, event: Event): void {
    event.stopPropagation();
    this.deleteLeaveTarget.set(leave.id);
    this.showLeaveDeleteModal.set(true);
  }

  executeDeleteLeave(): void {
    const id = this.deleteLeaveTarget();
    if (!id) return;
    this.submitting.set(true);
    this.employeeLeaveService.delete(this.employee.id, id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showLeaveDeleteModal.set(false);
        this.leaves.update(list => list.filter(l => l.id !== id));
        this.flash(this.lang.t('manager.leaves.deleted'));
        this.balance.set(null);
        this.balanceNotFound.set(false);
      },
      error: () => { this.submitting.set(false); this.showLeaveDeleteModal.set(false); },
    });
  }

  // ── Leave Balance ─────────────────────────────────────────────────────────────
  loadBalance(): void {
    this.balanceLoading.set(true);
    this.balanceError.set(null);
    this.balanceNotFound.set(false);
    this.leaveBalanceService.getByYear(this.employee.id, this.balanceYear()).subscribe({
      next: (res: any) => {
        const raw   = res?.data ?? res;
        const items = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const found = items[0] ?? null;
        this.balance.set(found);
        this.balanceNotFound.set(!found);
        this.balanceLoading.set(false);
      },
      error: err => {
        this.balanceLoading.set(false);
        this.balance.set(null);
        this.balanceError.set(this.apiErr(err, 'Failed to load leave balance.'));
      },
    });
  }

  changeBalanceYear(year: number): void {
    this.balanceYear.set(year);
    this.loadBalance();
  }

  openAddBalance(): void {
    this.balanceAddForm.reset({ totalDays: 21 });
    this.modalError.set(null);
    this.showBalanceAddModal.set(true);
  }

  submitAddBalance(): void {
    if (this.balanceAddForm.invalid) { this.balanceAddForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);
    this.leaveBalanceService.create(this.employee.id, {
      year:      this.balanceYear(),
      totalDays: this.balanceAddForm.value.totalDays!,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showBalanceAddModal.set(false);
        this.flash(this.lang.t('manager.leaveBalance.added'));
        this.loadBalance();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to create leave balance.')); },
    });
  }

  openEditBalance(): void {
    const b = this.balance();
    if (!b) return;
    this.balanceEditForm.reset({ totalDays: b.totalDays });
    this.modalError.set(null);
    this.showBalanceEditModal.set(true);
  }

  submitEditBalance(): void {
    if (this.balanceEditForm.invalid) { this.balanceEditForm.markAllAsTouched(); return; }
    const b = this.balance();
    if (!b) return;
    this.submitting.set(true);
    this.modalError.set(null);
    this.leaveBalanceService.update(this.employee.id, b.id, {
      totalDays: this.balanceEditForm.value.totalDays!,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showBalanceEditModal.set(false);
        this.flash(this.lang.t('manager.leaveBalance.updated'));
        this.loadBalance();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to update leave balance.')); },
    });
  }

  confirmDeleteBalance(): void {
    this.showBalanceDeleteModal.set(true);
  }

  executeDeleteBalance(): void {
    const b = this.balance();
    if (!b) return;
    this.submitting.set(true);
    this.leaveBalanceService.delete(this.employee.id, b.id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showBalanceDeleteModal.set(false);
        this.balance.set(null);
        this.balanceNotFound.set(true);
        this.flash(this.lang.t('manager.leaveBalance.deleted'));
      },
      error: () => { this.submitting.set(false); this.showBalanceDeleteModal.set(false); },
    });
  }

  openCarryOver(): void {
    this.carryOverForm.reset({ fromYear: this.balanceYear() - 1, toYear: this.balanceYear() });
    this.modalError.set(null);
    this.showCarryOverModal.set(true);
  }

  submitCarryOver(): void {
    if (this.carryOverForm.invalid) { this.carryOverForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.carryOverForm.value;
    this.leaveBalanceService.carryOver(this.employee.id, {
      fromYear: v.fromYear!,
      toYear:   v.toYear!,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showCarryOverModal.set(false);
        this.flash(this.lang.t('manager.leaveBalance.carriedOver'));
        this.balanceYear.set(v.toYear!);
        this.loadBalance();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to carry over leave balance.')); },
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
    if (body.errors && typeof body.errors === 'object') {
      const m = (Object.values(body.errors) as unknown[])
        .filter((s): s is string => typeof s === 'string').join('. ');
      if (m) return m;
    }
    for (const key of ['title', 'message', 'detail', 'error']) {
      const v = body[key];
      if (typeof v === 'string' && v.trim() && v.length < 400) return v.trim();
    }
    switch (err?.status) {
      case 401: return 'Session expired.';
      case 403: return 'Permission denied.';
      case 404: return 'Record not found.';
      case 400: return 'Invalid data submitted.';
      case 409: return 'Already exists.';
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

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value;
  const end   = group.get('endDate')?.value;
  return start && end && end < start ? { dateRange: true } : null;
}
