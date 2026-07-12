import { Component, signal, computed, inject, OnInit, DestroyRef, Injector } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { EMPTY, interval, switchMap, filter as rxFilter } from 'rxjs';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PayrollService } from '../../../../core/services/payroll.service';
import { EmployeeService } from '../../../../core/services/employee.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Role } from '../../../../core/models/auth.models';
import { ActiveEmployee } from '../../../../core/models/employee.models';
import { parsePayrollNotificationData } from '../../../../core/models/notification.models';
import {
  PayrollRunDetail, Payslip, ProcessingStatus,
} from '../../../../core/models/payroll.models';

const POLL_INTERVAL_MS = 6000;

function periodRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('periodStart')?.value;
  const end   = group.get('periodEnd')?.value;
  return start && end && end < start ? { periodRange: true } : null;
}

@Component({
  selector: 'app-payroll-detail',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './payroll-detail.component.html',
})
export class PayrollDetailComponent implements OnInit {
  private readonly payrollService     = inject(PayrollService);
  private readonly employeeService    = inject(EmployeeService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService        = inject(AuthService);
  private readonly lang               = inject(LanguageService);
  private readonly fb                 = inject(FormBuilder);
  private readonly route              = inject(ActivatedRoute);
  private readonly router             = inject(Router);
  private readonly destroyRef         = inject(DestroyRef);
  private readonly injector           = inject(Injector);

  payrollRunId = 0;
  readonly isCompanyManager = this.authService.getStoredRole() === Role.CompanyManager;

  // ── Run state ────────────────────────────────────────────────────────────────
  run         = signal<PayrollRunDetail | null>(null);
  loading     = signal(true);
  loadError   = signal<string | null>(null);

  // Optimistic override — set the instant a mutation that triggers recalculation
  // returns 200, before any refetch confirms it. Cleared once a refresh lands.
  private localProcessing = signal<ProcessingStatus | null>(null);

  processingStatus = computed<ProcessingStatus>(() =>
    this.localProcessing() ?? this.run()?.processingStatus ?? 'Idle');

  /** status and processingStatus are independent axes — a run can be Draft AND
   *  Processing at once during a recalculation, so both must hold. */
  canMutate = computed(() => {
    const r = this.run();
    return !!r && r.status === 'Draft' && this.processingStatus() !== 'Processing';
  });

  canApprove = computed(() => this.isCompanyManager && this.canMutate());
  canPay     = computed(() => this.isCompanyManager && this.run()?.status === 'Approved');

  // ── Payslip name filter (client-side over the already-loaded list) ──────────────
  payslipNameFilter = signal('');
  filteredPayslips = computed(() => {
    const term = this.payslipNameFilter().trim().toLowerCase();
    const payslips = this.run()?.payslips ?? [];
    if (!term) return payslips;
    return payslips.filter(p => p.employeeName.toLowerCase().includes(term));
  });

  // ── Flash / modal shared state ───────────────────────────────────────────────
  successMsg = signal<string | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);

  // ── Update period modal ───────────────────────────────────────────────────────
  showUpdatePeriodModal = signal(false);
  updatePeriodForm = this.fb.group({
    periodStart: ['', [Validators.required]],
    periodEnd:   ['', [Validators.required]],
  }, { validators: periodRangeValidator });

  // ── Add employees modal ───────────────────────────────────────────────────────
  showAddEmployeesModal  = signal(false);
  employeeFilter         = signal('');
  activeEmployees        = signal<ActiveEmployee[]>([]);
  activeEmployeesLoading = signal(false);
  activeEmployeesError   = signal<string | null>(null);
  selectedEmployeeIds    = signal<Set<number>>(new Set());

  alreadyOnRunIds = computed(() => new Set((this.run()?.payslips ?? []).map(p => p.employeeId)));
  pickableEmployees = computed(() =>
    this.activeEmployees().filter(e => !this.alreadyOnRunIds().has(e.id)));

  // ── Adjust payslip modal ──────────────────────────────────────────────────────
  showAdjustModal = signal(false);
  selectedPayslip = signal<Payslip | null>(null);
  adjustForm = this.fb.group({
    netSalary:       [0, [Validators.required]],
    adjustmentNotes: ['', [Validators.maxLength(500)]],
  });

  // ── Delete payslip / delete run / approve / pay modals ───────────────────────
  showDeletePayslipModal = signal(false);
  deletePayslipTarget    = signal<Payslip | null>(null);
  showDeleteRunModal     = signal(false);
  showApproveModal       = signal(false);
  showPayModal           = signal(false);

  ngOnInit(): void {
    this.payrollRunId = Number(this.route.snapshot.paramMap.get('payrollRunId'));
    this.loadRun();

    // Primary unlock signal — live push, scoped to this run.
    this.notificationService.notifications$.pipe(
      rxFilter(n => n.direct === 'Payroll'),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(n => {
      const data = parsePayrollNotificationData(n.data);
      if (data?.PayrollRunId === this.payrollRunId) this.refreshSilently();
    });

    // Safety-net poll — only while locally Processing, in case the push is missed.
    toObservable(this.processingStatus, { injector: this.injector }).pipe(
      switchMap(status => status === 'Processing' ? interval(POLL_INTERVAL_MS) : EMPTY),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.refreshSilently());
  }

  loadRun(): void {
    this.loading.set(true);
    this.payrollService.getById(this.payrollRunId).subscribe({
      next: res => {
        this.run.set(res);
        this.localProcessing.set(null);
        this.loadError.set(null);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.loadError.set(this.apiErr(err, 'Failed to load payroll run.'));
      },
    });
  }

  /** Background refresh used by the SignalR handler and the safety poll — no loading flicker, no toast on failure. */
  private refreshSilently(): void {
    this.payrollService.getById(this.payrollRunId, undefined, true).subscribe({
      next: res => {
        this.run.set(res);
        this.localProcessing.set(null);
      },
      error: () => { /* next poll tick (or the next SignalR event) will retry */ },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/manager/payroll']);
  }

  // ── Update period ─────────────────────────────────────────────────────────────
  openUpdatePeriod(): void {
    const r = this.run();
    if (!r) return;
    this.updatePeriodForm.reset({ periodStart: r.periodStart.slice(0, 10), periodEnd: r.periodEnd.slice(0, 10) });
    this.modalError.set(null);
    this.showUpdatePeriodModal.set(true);
  }

  submitUpdatePeriod(): void {
    if (this.updatePeriodForm.invalid) { this.updatePeriodForm.markAllAsTouched(); return; }
    const r = this.run();
    if (!r) return;
    const hadPayslips = r.payslips.length > 0;
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.updatePeriodForm.value;
    this.payrollService.update(this.payrollRunId, { periodStart: v.periodStart!, periodEnd: v.periodEnd! }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showUpdatePeriodModal.set(false);
        if (hadPayslips) this.localProcessing.set('Processing');
        this.flash(this.t('updatePeriodSuccess'));
        this.refreshSilently();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to update period.')); },
    });
  }

  // ── Add employees ─────────────────────────────────────────────────────────────
  openAddEmployees(): void {
    this.employeeFilter.set('');
    this.selectedEmployeeIds.set(new Set());
    this.modalError.set(null);
    this.showAddEmployeesModal.set(true);
    this.loadActiveEmployees();
  }

  loadActiveEmployees(): void {
    this.activeEmployeesLoading.set(true);
    this.activeEmployeesError.set(null);
    this.employeeService.getActive(this.employeeFilter() || undefined).subscribe({
      next: list => {
        this.activeEmployees.set(list);
        this.activeEmployeesLoading.set(false);
      },
      error: err => {
        this.activeEmployeesLoading.set(false);
        this.activeEmployeesError.set(this.apiErr(err, 'Failed to load employees.'));
      },
    });
  }

  onEmployeeFilterChange(value: string): void {
    this.employeeFilter.set(value);
    this.loadActiveEmployees();
  }

  toggleEmployeeSelected(id: number): void {
    this.selectedEmployeeIds.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  submitAddEmployees(): void {
    const ids = [...this.selectedEmployeeIds()];
    if (ids.length === 0 || !this.canMutate()) return;
    this.submitting.set(true);
    this.modalError.set(null);
    this.payrollService.addPayslips(this.payrollRunId, { employeeIds: ids }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAddEmployeesModal.set(false);
        // Optimistic lock — flips before any refetch confirms it server-side.
        this.localProcessing.set('Processing');
        this.flash(this.t('addEmployeesSuccess'));
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to add employees.')); },
    });
  }

  // ── Adjust payslip ────────────────────────────────────────────────────────────
  openAdjust(p: Payslip, event: Event): void {
    event.stopPropagation();
    this.selectedPayslip.set(p);
    this.adjustForm.reset({ netSalary: p.netSalary, adjustmentNotes: p.adjustmentNotes ?? '' });
    this.modalError.set(null);
    this.showAdjustModal.set(true);
  }

  submitAdjust(): void {
    if (this.adjustForm.invalid) { this.adjustForm.markAllAsTouched(); return; }
    const p = this.selectedPayslip();
    if (!p) return;
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.adjustForm.value;
    this.payrollService.updatePayslip(this.payrollRunId, p.id, {
      netSalary:       Number(v.netSalary),
      adjustmentNotes: v.adjustmentNotes || null,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAdjustModal.set(false);
        this.flash(this.t('adjustSuccess'));
        this.refreshSilently();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to adjust payslip.')); },
    });
  }

  // ── Delete payslip ────────────────────────────────────────────────────────────
  confirmDeletePayslip(p: Payslip, event: Event): void {
    event.stopPropagation();
    this.deletePayslipTarget.set(p);
    this.showDeletePayslipModal.set(true);
  }

  executeDeletePayslip(): void {
    const p = this.deletePayslipTarget();
    if (!p) return;
    this.submitting.set(true);
    this.payrollService.deletePayslip(this.payrollRunId, p.id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeletePayslipModal.set(false);
        this.flash(this.t('payslipDeleted'));
        this.refreshSilently();
      },
      error: () => { this.submitting.set(false); this.showDeletePayslipModal.set(false); },
    });
  }

  // ── Delete run ─────────────────────────────────────────────────────────────────
  confirmDeleteRun(): void { this.showDeleteRunModal.set(true); }

  executeDeleteRun(): void {
    this.submitting.set(true);
    this.payrollService.delete(this.payrollRunId).subscribe({
      next: () => { this.router.navigate(['/dashboard/manager/payroll']); },
      error: () => { this.submitting.set(false); this.showDeleteRunModal.set(false); },
    });
  }

  // ── Approve / Pay ──────────────────────────────────────────────────────────────
  confirmApprove(): void { this.showApproveModal.set(true); }

  executeApprove(): void {
    this.submitting.set(true);
    this.payrollService.approve(this.payrollRunId).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showApproveModal.set(false);
        this.flash(this.t('approved'));
        this.refreshSilently();
      },
      error: err => { this.submitting.set(false); this.showApproveModal.set(false); this.modalError.set(this.apiErr(err, 'Failed to approve.')); },
    });
  }

  confirmPay(): void { this.showPayModal.set(true); }

  executePay(): void {
    this.submitting.set(true);
    this.payrollService.pay(this.payrollRunId).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showPayModal.set(false);
        this.flash(this.t('paid'));
        this.refreshSilently();
      },
      error: err => { this.submitting.set(false); this.showPayModal.set(false); this.modalError.set(this.apiErr(err, 'Failed to mark as paid.')); },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatAmount(a: number): string {
    return (a ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  exportExcel(): void {
    const r = this.run();
    if (!r) return;
    const headers = [
      'اسم الموظف', 'الراتب الأساسي', 'الساعات الفعلية', 'الساعات المتوقعة',
      'خصم النقص', 'ساعات إضافية', 'مبلغ الإضافي', 'الحوافز', 'الخصومات', 'صافي الراتب',
    ];
    const rows = this.filteredPayslips().map(p => [
      p.employeeName,
      p.baseSalary.toFixed(2),
      String(p.totalActualHours),
      String(p.totalExpectedHours),
      p.shortageDeduction.toFixed(2),
      String(p.overtimeHours),
      p.overtimeAmount.toFixed(2),
      p.totalIncentives.toFixed(2),
      p.totalDeductions.toFixed(2),
      p.netSalary.toFixed(2),
    ]);
    const BOM = '﻿';
    const csv = BOM + [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `كشف-رواتب-${r.periodStart.slice(0, 10)}-${r.periodEnd.slice(0, 10)}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  private flash(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3500);
  }

  /** Translates a manager.payroll.* key — used for flash messages built outside the template. */
  private t(key: string): string {
    return this.lang.t(`manager.payroll.${key}`);
  }

  apiErr(err: any, fallback: string): string {
    if (err?.status === 0) return 'Cannot connect to server.';
    const body = err?.error;
    const serverMsg = (() => {
      if (typeof body === 'string' && body.trim()) return body.trim();
      if (body) {
        for (const key of ['message', 'title', 'detail', 'error']) {
          const v = body[key];
          if (typeof v === 'string' && v.trim() && v.length < 400) return v.trim();
        }
      }
      return null;
    })();
    if (serverMsg) return serverMsg;

    switch (err?.status) {
      case 401: return 'Session expired.';
      case 403: return 'You do not have permission.';
      case 404: return 'Not found — it may have been removed, or an employee is no longer in this company.';
      case 409: return 'That employee is already on this payroll run.';
      case 412: return this.processingStatus() === 'Processing'
        ? 'Still calculating the previous change — please wait a moment.'
        : 'This payroll run can no longer be modified.';
      case 500: return 'Server error. Please try again later.';
      default:  return fallback;
    }
  }
}
