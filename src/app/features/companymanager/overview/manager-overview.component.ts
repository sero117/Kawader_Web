import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { Role, EmployeeType } from '../../../core/models/auth.models';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.models';
import { BranchService } from '../../../core/services/branch.service';
import { Branch } from '../../../core/models/branch.models';
import { DeviceService } from '../../../core/services/device.service';
import { AdmsService, AdmsLog } from '../../../core/services/adms.service';
import { PayrollService } from '../../../core/services/payroll.service';
import { CompanyTimeService } from '../../../core/services/company-time.service';

@Component({
  selector: 'app-manager-overview',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './manager-overview.component.html',
})
export class ManagerOverviewComponent implements OnInit {
  private readonly auth    = inject(AuthService);
  private readonly empSvc  = inject(EmployeeService);
  private readonly brSvc   = inject(BranchService);
  private readonly devSvc  = inject(DeviceService);
  private readonly admsSvc = inject(AdmsService);
  private readonly payrollSvc = inject(PayrollService);
  private readonly companyTime = inject(CompanyTimeService);

  loading         = signal(true);
  readonly managerName = this.auth.getDisplayName();
  readonly todayDate   = computed(() => this.companyTime.formatDate(new Date().toISOString(), 'ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }));

  employeeCount   = signal<number | null>(null);
  branchCount     = signal<number | null>(null);
  deviceCount     = signal<number | null>(null);
  todayPunchCount = signal<number | null>(null);
  payrollTotal    = signal<number | null>(null);
  payrollPrevTotal = signal<number | null>(null);

  displayEmployee = signal(0);
  displayBranch   = signal(0);
  displayDevice   = signal(0);
  displayPunch    = signal(0);
  displayPayroll  = signal(0);

  attendanceSummary = signal<{
    presentCount: number;
    absentCount:  number;
    lateCount:    number;
    rate:         number;
    rows:         { name: string; time: string; status: 'present' | 'late' | 'absent' }[];
  } | null>(null);
  recentLogs      = signal<AdmsLog[]>([]);
  chartDays       = signal<{ label: string; count: number; heightPx: number }[]>([]);
  recentEmployees = signal<Employee[]>([]);
  branches        = signal<Branch[]>([]);
  newHiresThisMonth = signal(0);
  devicesActiveToday = signal<{ active: number; total: number } | null>(null);

  // ── Attendance rate as a ring (circumference-based dash offset) ────────────
  private readonly ringCircumference = 2 * Math.PI * 34;
  readonly ringDashOffset = computed(() => {
    const rate = this.attendanceSummary()?.rate ?? 0;
    return this.ringCircumference * (1 - rate / 100);
  });

  /** On-time attendees only — the summary's own presentCount is "everyone who
   *  showed up" (on-time + late combined), so this subtracts lateCount to give
   *  a bucket that's mutually exclusive with "late" instead of overlapping it. */
  readonly onTimeCount = computed(() => {
    const s = this.attendanceSummary();
    return s ? Math.max(0, s.presentCount - s.lateCount) : 0;
  });

  readonly onTimeRate = computed(() => {
    const s = this.attendanceSummary();
    if (!s || s.presentCount === 0) return null;
    return Math.round((this.onTimeCount() / s.presentCount) * 100);
  });

  /** Today's punch count vs the average of the previous 6 days already on the
   *  7-day chart — a quick "is today normal" signal without a second request. */
  readonly punchTrendPct = computed(() => {
    const days = this.chartDays();
    if (days.length < 7) return null;
    const prev = days.slice(0, 6);
    const avg = prev.reduce((s, d) => s + d.count, 0) / prev.length;
    if (avg === 0) return null;
    return Math.round(((days[6].count - avg) / avg) * 100);
  });

  readonly avgSalary = computed(() => {
    const total = this.payrollTotal();
    const n = this.employeeCount();
    return total != null && n ? total / n : null;
  });

  readonly payrollTrendPct = computed(() => {
    const curr = this.payrollTotal();
    const prev = this.payrollPrevTotal();
    if (curr == null || !prev) return null;
    return Math.round(((curr - prev) / prev) * 100);
  });

  /** Top branches by headcount, from the same 50-employee sample used for
   *  "recently added" — a representative distribution, not an exact count for
   *  companies with more than 50 employees. */
  readonly branchDistribution = computed(() => {
    const list = this.branches();
    if (!list.length) return [];
    const counts = new Map<number, number>();
    for (const e of this.recentEmployeeSample) {
      if (e.branchId != null) counts.set(e.branchId, (counts.get(e.branchId) ?? 0) + 1);
    }
    const total = [...counts.values()].reduce((s, c) => s + c, 0);
    if (total === 0) return [];
    return list
      .map(b => ({ name: b.name, count: counts.get(b.id) ?? 0 }))
      .filter(b => b.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map(b => ({ ...b, pct: Math.round((b.count / total) * 100) }));
  });

  /** One-line synthesized read on today's attendance — the page's opening
   *  thesis rather than a generic greeting. */
  readonly heroStatusKey = computed(() => {
    const rate = this.attendanceSummary()?.rate;
    if (rate == null) return null;
    if (rate >= 90) return 'manager.overview.statusExcellent';
    if (rate >= 75) return 'manager.overview.statusGood';
    return 'manager.overview.statusWatch';
  });

  private recentEmployeeSample: Employee[] = [];
  private allLogsCache: AdmsLog[] = [];

  readonly isHr = this.auth.getStoredRole() === Role.Employee &&
                  this.auth.getStoredEmployeeType() === EmployeeType.HumanResourceManager;

  private readonly allQuickActions = [
    {
      labelKey: 'manager.overview.qEmployees',
      link: '/dashboard/manager/branches',
      iconD: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
      color: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    },
    {
      labelKey: 'manager.overview.qShifts',
      link: '/dashboard/manager/shifts',
      iconD: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
      color: 'linear-gradient(135deg, #0891b2, #06b6d4)',
    },
    {
      labelKey: 'manager.overview.qPayroll',
      link: '/dashboard/manager/payroll',
      iconD: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 18h16.5a1.5 1.5 0 0 0 1.5-1.5V7.5a1.5 1.5 0 0 0-1.5-1.5H3.75a1.5 1.5 0 0 0-1.5 1.5v9a1.5 1.5 0 0 0 1.5 1.5Z',
      color: 'linear-gradient(135deg, #059669, #10b981)',
    },
    {
      labelKey: 'manager.overview.qDevices',
      link: '/dashboard/manager/devices',
      iconD: 'M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z',
      color: 'linear-gradient(135deg, #d97706, #f59e0b)',
    },
  ];

  readonly quickActions = this.isHr
    ? this.allQuickActions.filter(a => a.labelKey === 'manager.overview.qShifts')
    : this.allQuickActions;

  ngOnInit(): void {
    const todayIso = this.companyTime.todayIso();
    const isHr = this.isHr;

    forkJoin({
      employees: this.empSvc.getActive(undefined, undefined, true).pipe(catchError(() => of([]))),
      branches:  isHr ? of(null) : this.brSvc.getAll({ pageNumber: 1, pageSize: 100 }, true).pipe(catchError(() => of(null))),
      devices:   isHr ? of(null) : this.devSvc.getAll(1, 1).pipe(catchError(() => of(null))),
      logs:      isHr ? of(null) : this.admsSvc.getLogs().pipe(catchError(() => of(null))),
      payrolls:  isHr ? of(null) : this.payrollSvc.getAll({ pageNumber: 1, pageSize: 2 }).pipe(catchError(() => of(null))),
      employeeList: this.empSvc.getAll({ pageNumber: 1, pageSize: 50 }).pipe(catchError(() => of(null))),
    }).subscribe(({ employees, branches, devices, logs, payrolls, employeeList }) => {
      const runs = payrolls?.items ?? [];
      const [latestRun, prevRun] = runs;
      if (latestRun) {
        this.payrollSvc.getById(latestRun.id, undefined, true).subscribe({
          next: detail => {
            const total = (detail.payslips ?? []).reduce((sum, p) => sum + (p.netSalary ?? 0), 0);
            this.payrollTotal.set(total);
            this.countUp(v => this.displayPayroll.set(v), Math.round(total));
          },
          error: () => this.payrollTotal.set(null),
        });
      } else {
        this.payrollTotal.set(0);
      }
      if (prevRun) {
        this.payrollSvc.getById(prevRun.id, undefined, true).subscribe({
          next: detail => {
            const total = (detail.payslips ?? []).reduce((sum, p) => sum + (p.netSalary ?? 0), 0);
            this.payrollPrevTotal.set(total);
          },
          error: () => this.payrollPrevTotal.set(null),
        });
      }
      this.employeeCount.set(Array.isArray(employees) ? employees.length : 0);

      const brRes = (branches as any)?.data ?? branches;
      const branchList: Branch[] = Array.isArray(brRes) ? brRes : (brRes?.items ?? []);
      this.branches.set(branchList);
      this.branchCount.set(brRes?.totalCount ?? branchList.length ?? null);

      const devRes = (devices as any)?.data ?? devices;
      this.deviceCount.set(devRes?.totalCount ?? devRes?.items?.length ?? null);

      // Recently added employees — sorted client-side by createdAt, newest first.
      const empListRaw = (employeeList as any)?.data ?? employeeList;
      const fullEmployees: Employee[] = Array.isArray(empListRaw)
        ? empListRaw
        : (empListRaw?.items ?? empListRaw?.data ?? []);
      this.recentEmployeeSample = fullEmployees;
      const sortedByNewest = [...fullEmployees]
        .filter(e => !!e.createdAt)
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
      this.recentEmployees.set(sortedByNewest.slice(0, 5));

      const nowCompany = this.companyTime.toCompanyTime();
      const thisYear  = nowCompany.getUTCFullYear();
      const thisMonth = nowCompany.getUTCMonth();
      this.newHiresThisMonth.set(sortedByNewest.filter(e => {
        const d = this.companyTime.toCompanyTime(e.createdAt);
        return d.getUTCFullYear() === thisYear && d.getUTCMonth() === thisMonth;
      }).length);

      const allLogs: AdmsLog[] = Array.isArray(logs)
        ? logs
        : ((logs as any)?.data?.items ?? (logs as any)?.data ?? (logs as any)?.items ?? []);
      this.allLogsCache = allLogs;
      const todayLogs = allLogs.filter(l =>
        (l.punchTime ?? l.timestamp ?? l.time ?? '').startsWith(todayIso),
      );
      this.todayPunchCount.set(todayLogs.length);
      this.recentLogs.set([...todayLogs].reverse().slice(0, 6));

      if (!isHr && this.deviceCount()) {
        const deviceKeys = new Set(
          todayLogs
            .map(l => l.deviceSerial ?? l.serialNumber ?? l.deviceName)
            .filter((v): v is string => !!v),
        );
        this.devicesActiveToday.set({ active: deviceKeys.size, total: this.deviceCount()! });
      }

      // Attendance summary: deduplicate by employee, first punch only
      const LATE_HOUR = 9;
      const seenKeys   = new Set<string>();
      const presentIds = new Set<number>();
      const sumRows: { name: string; time: string; status: 'present' | 'late' | 'absent' }[] = [];
      for (const log of [...todayLogs].sort((a, b) =>
        (a.punchTime ?? a.timestamp ?? a.time ?? '').localeCompare(b.punchTime ?? b.timestamp ?? b.time ?? ''),
      )) {
        const key = String(log.employeeId ?? log.deviceEmployeeNumber ?? log.number ?? '');
        if (key && seenKeys.has(key)) continue;
        if (key) seenKeys.add(key);
        if (log.employeeId !== undefined) presentIds.add(log.employeeId);
        const raw  = log.punchTime ?? log.timestamp ?? log.time ?? '';
        const hour = raw ? this.companyTime.hour(raw) : -1;
        sumRows.push({
          name:   log.employeeName ?? `#${String(log.deviceEmployeeNumber ?? log.number ?? '?')}`,
          time:   raw ? this.companyTime.formatTime(raw) : '—',
          status: hour >= LATE_HOUR ? 'late' : 'present',
        });
      }
      const presentCount = sumRows.length;
      const empList      = Array.isArray(employees) ? employees : [];
      const empTotal      = Math.max(empList.length, presentCount);
      const absentRows = empList
        .filter(e => !presentIds.has(e.id))
        .map(e => ({ name: e.fullName, time: '—', status: 'absent' as const }));
      this.attendanceSummary.set({
        presentCount,
        absentCount: Math.max(0, empTotal - presentCount),
        lateCount:   sumRows.filter(r => r.status === 'late').length,
        rate:        empTotal > 0 ? Math.round((presentCount / empTotal) * 100) : 0,
        rows:        [...sumRows, ...absentRows].slice(0, 12),
      });

      this.buildChart(this.companyTime.toCompanyTime());

      this.loading.set(false);
      if (this.employeeCount()   !== null) this.countUp(v => this.displayEmployee.set(v), this.employeeCount()!);
      if (this.branchCount()     !== null) this.countUp(v => this.displayBranch.set(v),   this.branchCount()!);
      if (this.deviceCount()     !== null) this.countUp(v => this.displayDevice.set(v),   this.deviceCount()!);
      if (this.todayPunchCount() !== null) this.countUp(v => this.displayPunch.set(v),    this.todayPunchCount()!);
    });
  }

  /** 7-day punch chart ending on `anchor` — re-run whenever the calendar
   *  selection changes, reusing the already-fetched logs (no new request). */
  private buildChart(anchor: Date): void {
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(anchor);
      d.setUTCDate(d.getUTCDate() - (6 - i));
      const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      return {
        iso,
        label: d.toLocaleDateString('ar-SA', { weekday: 'short', timeZone: 'UTC' }),
        count: 0,
      };
    });
    for (const log of this.allLogsCache) {
      const t = log.punchTime ?? log.timestamp ?? log.time ?? '';
      const slot = last7.find(d => t.startsWith(d.iso));
      if (slot) slot.count++;
    }
    const maxCount = Math.max(1, ...last7.map(d => d.count));
    this.chartDays.set(last7.map(d => ({
      label:    d.label,
      count:    d.count,
      heightPx: d.count === 0 ? 3 : Math.max(8, Math.round((d.count / maxCount) * 100)),
    })));
  }

  private countUp(setter: (v: number) => void, target: number, duration = 900): void {
    if (target <= 0) { setter(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setter(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  formatAmount(a: number): string {
    return (a ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  logTime(log: AdmsLog): string {
    const raw = log.punchTime ?? log.timestamp ?? log.time ?? '';
    if (!raw) return '—';
    try {
      return this.companyTime.formatTime(raw);
    } catch { return raw.substring(11, 16) || '—'; }
  }

  logName(log: AdmsLog): string {
    return log.employeeName ?? log.deviceEmployeeNumber ?? log.number ?? '—';
  }

  employeeName(e: Employee): string {
    return `${e.firstName} ${e.lastName}`.trim();
  }

  employeeAddedDate(e: Employee): string {
    if (!e.createdAt) return '—';
    try { return this.companyTime.formatDate(e.createdAt, 'ar-SA', { month: 'short', day: 'numeric' }); }
    catch { return e.createdAt.substring(0, 10); }
  }
}
