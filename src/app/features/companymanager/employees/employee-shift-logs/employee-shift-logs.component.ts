import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { EmployeeService } from '../../../../core/services/employee.service';
import { ShiftLogService } from '../../../../core/services/shift-log.service';
import { ShiftService } from '../../../../core/services/shift.service';
import { ShiftSystemService } from '../../../../core/services/shift-system.service';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { CompanyTimeService } from '../../../../core/services/company-time.service';
import { Employee } from '../../../../core/models/employee.models';
import { ShiftLog, Shift, AttendanceStatus, CreateShiftLogRequest } from '../../../../core/models/shift.models';

@Component({
  selector: 'app-employee-shift-logs',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './employee-shift-logs.component.html',
})
export class EmployeeShiftLogsComponent implements OnInit {
  private readonly employeeService   = inject(EmployeeService);
  private readonly shiftLogService   = inject(ShiftLogService);
  private readonly shiftService      = inject(ShiftService);
  private readonly shiftSystemService = inject(ShiftSystemService);
  private readonly snackbar          = inject(SnackbarService);
  private readonly companyTime       = inject(CompanyTimeService);
  private readonly fb                = inject(FormBuilder);
  private readonly lang              = inject(LanguageService);
  private readonly route             = inject(ActivatedRoute);
  private readonly router            = inject(Router);

  readonly AttendanceStatus = AttendanceStatus;
  readonly statusList = [
    AttendanceStatus.Present, AttendanceStatus.Absent, AttendanceStatus.Late, AttendanceStatus.EarlyLeave,
  ];

  employeeId = 0;
  employee   = signal<Employee | null>(null);
  backUrl    = signal('/dashboard/manager/employees');

  view              = signal<'list' | 'add' | 'edit'>('list');
  shiftLogsList     = signal<ShiftLog[]>([]);
  loading           = signal(false);
  listError         = signal<string | null>(null);
  hasMore           = signal(false);
  page              = signal(1);
  submitting        = signal(false);
  modalError        = signal<string | null>(null);
  hasShift          = signal<boolean | null>(null);
  availableShifts   = signal<Shift[]>([]);
  editTarget        = signal<ShiftLog | null>(null);
  deleteTarget      = signal<ShiftLog | null>(null);
  showDeleteConfirm = signal(false);
  successMsg        = signal<string | null>(null);

  addForm = this.fb.group({
    shiftId:      [null as number | null, [Validators.required]],
    date:         ['', [Validators.required]],
    checkInTime:  ['', [Validators.required]],
    notes:        [''],
  });

  editForm = this.fb.group({
    checkOutTime: [''],
    status:       [AttendanceStatus.Present, Validators.required],
    notes:        [''],
  });

  ngOnInit(): void {
    this.employeeId = Number(this.route.snapshot.paramMap.get('employeeId'));
    this.backUrl.set(this.router.url.startsWith('/dashboard/hr') ? '/dashboard/hr/employees' : '/dashboard/manager/employees');
    this.employeeService.getById(this.employeeId).subscribe({
      next: (res: any) => this.employee.set(res?.data ?? res),
      error: () => {},
    });
    this.shiftService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res;
        this.availableShifts.set(Array.isArray(raw) ? raw : (raw?.items ?? []));
      },
      error: () => {},
    });
    this.loadShiftLogs();
  }

  openAdd(): void {
    this.addForm.reset({ date: this.companyTime.todayIso() });
    this.modalError.set(null);
    this.hasShift.set(null);
    this.view.set('add');
    this.shiftSystemService.getEmployeeShiftSystem(this.employeeId).subscribe({
      next: () => this.hasShift.set(true),
      error: (err: any) => this.hasShift.set(err?.status === 404 ? false : true),
    });
  }

  cancelAdd(): void { this.view.set('list'); }

  submitAdd(): void {
    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.addForm.value;
    const payload: CreateShiftLogRequest = {
      shiftId:        v.shiftId!,
      date:           v.date!,
      checkInTime:    this.toTimeString(v.checkInTime!),
      notes:          v.notes || null,
      idempotencyKey: crypto.randomUUID(),
    };
    this.shiftLogService.create(this.employeeId, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.view.set('list');
        this.page.set(1);
        this.loadShiftLogs();
        this.flash('Attendance recorded.');
      },
      error: (err: any) => {
        this.submitting.set(false);
        let msg = this.apiErr(err, 'Failed to record attendance.');
        if (err?.status === 404) msg = 'الموظف غير مسند لنظام دوام نشط. يرجى تعيين الموظف على نظام دوام أولاً.';
        else if (err?.status === 412) msg = 'تم تسجيل الحضور لهذا اليوم مسبقاً.';
        this.snackbar.show(msg, 'error');
      },
    });
  }

  loadShiftLogs(): void {
    this.loading.set(true);
    this.shiftLogService.getAll({ pageNumber: this.page(), pageSize: 10, employeeId: this.employeeId }).subscribe({
      next: (res: any) => {
        const raw   = res?.data ?? res;
        const items: ShiftLog[] = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
        const total = raw?.totalCount ?? items.length;
        this.shiftLogsList.set(items);
        this.hasMore.set(this.page() * 10 < total);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.listError.set(this.apiErr(err, 'Failed to load attendance logs.'));
      },
    });
  }

  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.loadShiftLogs(); } }
  nextPage(): void { if (this.hasMore()) { this.page.update(p => p + 1); this.loadShiftLogs(); } }

  openEdit(log: ShiftLog): void {
    this.editTarget.set(log);
    this.editForm.patchValue({
      checkOutTime: log.checkOutTime ? log.checkOutTime.substring(0, 5) : '',
      status:       log.status,
      notes:        log.notes ?? '',
    });
    this.modalError.set(null);
    this.view.set('edit');
  }

  cancelEdit(): void { this.view.set('list'); }

  submitEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const log = this.editTarget();
    if (!log) return;
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.editForm.value;
    this.shiftLogService.update(this.employeeId, log.id, {
      checkOutTime: v.checkOutTime ? this.toTimeString(v.checkOutTime) : null,
      status:       v.status!,
      notes:        v.notes || null,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.view.set('list');
        this.loadShiftLogs();
        this.flash('Attendance updated.');
      },
      // No local error banner — the global interceptor already shows this
      // failure as a snackbar.
      error: () => { this.submitting.set(false); },
    });
  }

  confirmDelete(log: ShiftLog): void { this.deleteTarget.set(log); this.showDeleteConfirm.set(true); }
  cancelDelete(): void { this.showDeleteConfirm.set(false); }

  executeDelete(): void {
    const log = this.deleteTarget();
    if (!log) return;
    this.submitting.set(true);
    this.shiftLogService.delete(this.employeeId, log.id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeleteConfirm.set(false);
        this.shiftLogsList.update(list => list.filter(l => l.id !== log.id));
        this.flash('Attendance deleted.');
      },
      error: () => { this.submitting.set(false); this.showDeleteConfirm.set(false); },
    });
  }

  statusLabel(s: AttendanceStatus): string { return this.lang.t(`manager.attendanceStatus.${s}`); }

  formatDate(d?: string): string {
    return this.companyTime.formatDate(d);
  }

  private toTimeString(t: string): string { return t.length === 5 ? `${t}:00` : t; }

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
      case 401: return 'Session expired. Please sign in again.';
      case 403: return 'You do not have permission.';
      case 404: return 'Not found.';
      case 412: return 'No changes detected or record already deleted.';
      case 500: return 'Server error. Please try again later.';
      default:  return fallback;
    }
  }
}
