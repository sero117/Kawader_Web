import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { ShiftLogService } from '../../../core/services/shift-log.service';
import { ShiftSystemService } from '../../../core/services/shift-system.service';
import {
  ShiftLog, ShiftSystem,
  AttendanceStatus, GetShiftLogsParams,
} from '../../../core/models/shift.models';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.models';
import { CompanyTimeService } from '../../../core/services/company-time.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';

@Component({
  selector: 'app-shift-logs',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './shift-logs.component.html',
})
export class ShiftLogsComponent implements OnInit {
  private readonly logService      = inject(ShiftLogService);
  private readonly systemService   = inject(ShiftSystemService);
  private readonly employeeService = inject(EmployeeService);
  private readonly lang            = inject(LanguageService);
  private readonly companyTime     = inject(CompanyTimeService);

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
  allSystems   = signal<ShiftSystem[]>([]);
  allEmployees = signal<Employee[]>([]);
  loading      = signal(true);
  hasMore      = signal(false);
  listError    = signal<string | null>(null);

  readonly AttendanceStatus = AttendanceStatus;

  ngOnInit(): void {
    this.loadLogs();
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
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  /** Debounced so fast typing doesn't fire a request per keystroke. */
  onEmployeeIdFilter(value: string): void {
    this.filter.patch({ employeeId: value, pageNumber: 1 });
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadLogs(), 350);
  }

  // Selects and date pickers apply immediately — a picked value is always
  // complete, so there's no need to debounce it.
  onImmediateFilter(patch: Partial<{ shiftSystemId: string; fromDate: string; toDate: string }>): void {
    this.filter.patch({ ...patch, pageNumber: 1 });
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
    return this.companyTime.formatDate(d);
  }

  exportCsv(): void {
    const headers = ['الرقم', 'اسم الموظف', 'الوردية', 'التاريخ', 'وقت الدخول', 'وقت الخروج', 'الحالة', 'ملاحظات'];
    const rows = this.logs().map(l => [
      String(l.id),
      `${l.employeeFirstName ?? ''} ${l.employeeLastName ?? ''}`.trim() || String(l.employeeId),
      l.shiftName,
      this.formatDate(l.date),
      this.formatTime(l.checkInTime),
      this.formatTime(l.checkOutTime),
      this.statusLabel(l.status),
      l.notes ?? '',
    ]);
    const BOM = '﻿';
    const csv = BOM + [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `سجلات-الحضور-${new Date().toLocaleDateString('en-CA')}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  apiErr(err: any, fallback: string): string {
    return apiErrorMessage(err, fallback, {
      404: 'Log not found.',
    });
  }
}
