import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { ShiftLogService } from '../../../core/services/shift-log.service';
import { ShiftService } from '../../../core/services/shift.service';
import { ShiftSystemService } from '../../../core/services/shift-system.service';
import {
  ShiftLog, Shift, ShiftSystem,
  AttendanceStatus, GetShiftLogsParams,
} from '../../../core/models/shift.models';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.models';

@Component({
  selector: 'app-shift-logs',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './shift-logs.component.html',
})
export class ShiftLogsComponent implements OnInit {
  private readonly logService      = inject(ShiftLogService);
  private readonly shiftService    = inject(ShiftService);
  private readonly systemService   = inject(ShiftSystemService);
  private readonly employeeService = inject(EmployeeService);
  private readonly fb            = inject(FormBuilder);
  private readonly lang          = inject(LanguageService);

  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    employeeId:    '',
    shiftSystemId: '',
    fromDate:      '',
    toDate:        '',
    pageNumber:    1,
    pageSize:      10,
  });

  // ── Data ─────────────────────────────────────────────────────────────────────
  logs          = signal<ShiftLog[]>([]);
  allShifts     = signal<Shift[]>([]);
  allSystems    = signal<ShiftSystem[]>([]);
  allEmployees  = signal<Employee[]>([]);
  loading      = signal(true);
  hasMore      = signal(false);

  // ── Flash / error ────────────────────────────────────────────────────────────
  successMsg = signal<string | null>(null);
  listError  = signal<string | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);

  // ── Modals ────────────────────────────────────────────────────────────────────
  showAddModal    = signal(false);
  showEditModal   = signal(false);
  showDeleteModal = signal(false);
  selectedLog     = signal<ShiftLog | null>(null);
  deleteTargetId  = signal<{ empId: number; logId: number } | null>(null);

  readonly AttendanceStatus = AttendanceStatus;

  readonly statusList = [
    AttendanceStatus.Present,
    AttendanceStatus.Absent,
    AttendanceStatus.Late,
    AttendanceStatus.EarlyLeave,
  ];

  addForm = this.fb.group({
    employeeId:  [null as number | null, [Validators.required, Validators.min(1)]],
    shiftId:     [null as number | null, [Validators.required, Validators.min(1)]],
    date:        ['', [Validators.required]],
    checkInTime: ['', [Validators.required]],
    notes:       ['', [Validators.maxLength(500)]],
  });

  editForm = this.fb.group({
    checkOutTime: [''],
    status:       [AttendanceStatus.Present, Validators.required],
    notes:        ['', [Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    this.loadLogs();
    this.loadShifts();
    this.loadSystems();
    this.loadEmployees();
  }

  loadLogs(): void {
    this.loading.set(true);
    const { employeeId, shiftSystemId, fromDate, toDate, pageNumber, pageSize } = this.filter.value();
    const params: GetShiftLogsParams = { pageNumber, pageSize };
    if (employeeId)    params.employeeId    = Number(employeeId);
    if (shiftSystemId) params.shiftSystemId = Number(shiftSystemId);
    if (fromDate)      params.fromDate      = fromDate;
    if (toDate)        params.toDate        = toDate;

    this.logService.getAll(params).subscribe({
      next: (res: any) => {
        this.listError.set(null);
        const raw   = res?.data ?? res;
        const items: ShiftLog[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const total = raw?.totalCount ?? items.length;
        this.logs.set(items);
        this.hasMore.set(pageNumber * pageSize < total);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.listError.set(this.apiErr(err, 'Failed to load attendance logs.'));
      },
    });
  }

  private loadShifts(): void {
    this.shiftService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res: any) => {
        const raw  = res?.data ?? res;
        const list: Shift[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        this.allShifts.set(list);
      },
      error: () => {},
    });
  }

  private loadEmployees(): void {
    this.employeeService.getAll({ pageNumber: 1, pageSize: 200 }).subscribe({
      next: (res: any) => {
        const raw  = res?.data ?? res;
        const list: Employee[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        this.allEmployees.set(list);
      },
      error: () => {},
    });
  }

  private loadSystems(): void {
    this.systemService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res: any) => {
        const raw  = res?.data ?? res;
        const list: ShiftSystem[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        this.allSystems.set(list);
      },
      error: () => {},
    });
  }

  // ── Filter & Pagination ───────────────────────────────────────────────────────
  applyFilter(): void {
    this.filter.patch({ pageNumber: 1 });
    this.loadLogs();
  }

  prevPage(): void {
    if (this.filter.value().pageNumber <= 1) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber - 1 });
    this.loadLogs();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber + 1 });
    this.loadLogs();
  }

  // ── Add ──────────────────────────────────────────────────────────────────────
  openAdd(): void {
    this.addForm.reset();
    this.modalError.set(null);
    this.showAddModal.set(true);
  }

  submitAdd(): void {
    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.addForm.value;
    this.logService.create(v.employeeId!, {
      shiftId:        v.shiftId!,
      date:           v.date!,
      checkInTime:    this.toTimeString(v.checkInTime!),
      notes:          v.notes || null,
      idempotencyKey: crypto.randomUUID(),
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAddModal.set(false);
        this.flash('Attendance log added.');
        this.filter.patch({ pageNumber: 1 });
        this.loadLogs();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to add log.')); },
    });
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  openEdit(log: ShiftLog, event: Event): void {
    event.stopPropagation();
    this.selectedLog.set(log);
    this.editForm.patchValue({
      checkOutTime: log.checkOutTime ? log.checkOutTime.substring(0, 5) : '',
      status:       log.status,
      notes:        log.notes ?? '',
    });
    this.modalError.set(null);
    this.showEditModal.set(true);
  }

  submitEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const log = this.selectedLog();
    if (!log) return;
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.editForm.value;
    this.logService.update(log.employeeId, log.id, {
      checkOutTime: v.checkOutTime ? this.toTimeString(v.checkOutTime) : null,
      status:       v.status!,
      notes:        v.notes || null,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showEditModal.set(false);
        this.flash('Log updated.');
        this.loadLogs();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Update failed.')); },
    });
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  confirmDelete(log: ShiftLog, event: Event): void {
    event.stopPropagation();
    this.deleteTargetId.set({ empId: log.employeeId, logId: log.id });
    this.showDeleteModal.set(true);
  }

  executeDelete(): void {
    const target = this.deleteTargetId();
    if (!target) return;
    this.submitting.set(true);
    this.logService.delete(target.empId, target.logId).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeleteModal.set(false);
        this.logs.update(list => list.filter(l => l.id !== target.logId));
        this.flash('Log deleted.');
      },
      error: () => { this.submitting.set(false); this.showDeleteModal.set(false); },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  statusLabel(s: AttendanceStatus): string {
    return this.lang.t(`manager.attendanceStatus.${s}`);
  }

  statusColor(s: AttendanceStatus): string {
    switch (s) {
      case AttendanceStatus.Present:    return 'rgba(52,211,153,0.9)';
      case AttendanceStatus.Late:       return 'rgba(251,191,36,0.9)';
      case AttendanceStatus.EarlyLeave: return 'rgba(251,146,60,0.9)';
      case AttendanceStatus.Absent:     return 'rgba(239,68,68,0.9)';
    }
  }

  statusBg(s: AttendanceStatus): string {
    switch (s) {
      case AttendanceStatus.Present:    return 'rgba(52,211,153,0.08)';
      case AttendanceStatus.Late:       return 'rgba(251,191,36,0.08)';
      case AttendanceStatus.EarlyLeave: return 'rgba(251,146,60,0.08)';
      case AttendanceStatus.Absent:     return 'rgba(239,68,68,0.08)';
    }
  }

  statusBorder(s: AttendanceStatus): string {
    switch (s) {
      case AttendanceStatus.Present:    return 'rgba(52,211,153,0.2)';
      case AttendanceStatus.Late:       return 'rgba(251,191,36,0.2)';
      case AttendanceStatus.EarlyLeave: return 'rgba(251,146,60,0.2)';
      case AttendanceStatus.Absent:     return 'rgba(239,68,68,0.2)';
    }
  }

  formatTime(t?: string | null): string {
    return t ? t.substring(0, 5) : '—';
  }

  formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private toTimeString(t: string): string {
    return t.length === 5 ? `${t}:00` : t;
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
      case 404: return 'Log not found.';
      case 409: return 'A log already exists for this employee on this date.';
      case 422: return 'Employee has no active shift assignment.';
      case 500: return 'Server error. Please try again.';
      default:  return fallback;
    }
  }
}
