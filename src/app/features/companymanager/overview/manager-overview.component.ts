import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { BranchService } from '../../../core/services/branch.service';
import { DeviceService } from '../../../core/services/device.service';
import { AdmsService, AdmsLog } from '../../../core/services/adms.service';

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

  loading         = signal(true);
  readonly managerName = this.auth.getDisplayName();
  readonly todayDate   = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  employeeCount   = signal<number | null>(null);
  branchCount     = signal<number | null>(null);
  deviceCount     = signal<number | null>(null);
  todayPunchCount = signal<number | null>(null);
  recentLogs      = signal<AdmsLog[]>([]);

  readonly quickActions = [
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

  ngOnInit(): void {
    const todayIso = new Date().toISOString().split('T')[0];

    forkJoin({
      employees: this.empSvc.getActive().pipe(catchError(() => of([]))),
      branches:  this.brSvc.getAll({ pageNumber: 1, pageSize: 1 }).pipe(catchError(() => of(null))),
      devices:   this.devSvc.getAll(1, 1).pipe(catchError(() => of(null))),
      logs:      this.admsSvc.getLogs().pipe(catchError(() => of(null))),
    }).subscribe(({ employees, branches, devices, logs }) => {
      this.employeeCount.set(Array.isArray(employees) ? employees.length : 0);

      const brRes = (branches as any)?.data ?? branches;
      this.branchCount.set(brRes?.totalCount ?? brRes?.items?.length ?? null);

      const devRes = (devices as any)?.data ?? devices;
      this.deviceCount.set(devRes?.totalCount ?? devRes?.items?.length ?? null);

      const allLogs: AdmsLog[] = Array.isArray(logs)
        ? logs
        : ((logs as any)?.data?.items ?? (logs as any)?.data ?? (logs as any)?.items ?? []);
      const todayLogs = allLogs.filter(l =>
        (l.punchTime ?? l.timestamp ?? l.time ?? '').startsWith(todayIso),
      );
      this.todayPunchCount.set(todayLogs.length);
      this.recentLogs.set([...todayLogs].reverse().slice(0, 6));

      this.loading.set(false);
    });
  }

  logTime(log: AdmsLog): string {
    const raw = log.punchTime ?? log.timestamp ?? log.time ?? '';
    if (!raw) return '—';
    try {
      return new Date(raw).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    } catch { return raw.substring(11, 16) || '—'; }
  }

  logName(log: AdmsLog): string {
    return log.employeeName ?? log.deviceEmployeeNumber ?? log.number ?? '—';
  }
}
