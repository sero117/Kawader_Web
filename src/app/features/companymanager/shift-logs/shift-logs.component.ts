import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  imports: [TranslatePipe],
  templateUrl: './shift-logs.component.html',
})
export class ShiftLogsComponent implements OnInit {
  private readonly logService      = inject(ShiftLogService);
  private readonly shiftService    = inject(ShiftService);
  private readonly systemService   = inject(ShiftSystemService);
  private readonly employeeService = inject(EmployeeService);
  private readonly lang            = inject(LanguageService);

  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    employeeId:    '',
    shiftSystemId: '',
    fromDate:      '',
    toDate:        '',
    pageNumber:    1,
    pageSize:      10,
  });

  // ── Data ─────────────────────────────────────────────────────────────────────
  logs         = signal<ShiftLog[]>([]);
  allShifts    = signal<Shift[]>([]);
  allSystems   = signal<ShiftSystem[]>([]);
  allEmployees = signal<Employee[]>([]);
  loading      = signal(true);
  hasMore      = signal(false);
  listError    = signal<string | null>(null);

  readonly AttendanceStatus = AttendanceStatus;

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
      case 404: return 'Log not found.';
      case 500: return 'Server error. Please try again.';
      default:  return fallback;
    }
  }
}
