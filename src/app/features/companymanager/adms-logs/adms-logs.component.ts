import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AdmsService, AdmsLog } from '../../../core/services/adms.service';

const VERIFY_ICONS: Record<number, string> = {
  0: '🖐',
  1: '🃏',
  2: '🏷',
  3: '👁',
};

@Component({
  selector: 'app-adms-logs',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './adms-logs.component.html',
})
export class AdmsLogsComponent implements OnInit {
  private readonly admsService = inject(AdmsService);

  logs      = signal<AdmsLog[]>([]);
  loading   = signal(true);
  listError = signal<string | null>(null);

  searchQuery = signal('');
  fromDate    = signal('');
  toDate      = signal('');

  filtered = computed(() => {
    let list = this.logs();
    const q  = this.searchQuery().toLowerCase();
    const fd = this.fromDate();
    const td = this.toDate();
    if (q) {
      list = list.filter(l =>
        (l.employeeName ?? '').toLowerCase().includes(q) ||
        (l.deviceSerial ?? l.serialNumber ?? '').toLowerCase().includes(q) ||
        String(l.deviceEmployeeNumber ?? l.number ?? '').includes(q),
      );
    }
    if (fd) {
      list = list.filter(l => {
        const t = l.punchTime ?? l.timestamp ?? l.time ?? '';
        return t >= fd;
      });
    }
    if (td) {
      list = list.filter(l => {
        const t = l.punchTime ?? l.timestamp ?? l.time ?? '';
        return !t || t <= td + 'T23:59:59';
      });
    }
    return list;
  });

  ngOnInit(): void { this.loadLogs(); }

  loadLogs(): void {
    this.loading.set(true);
    this.listError.set(null);
    this.admsService.getLogs().subscribe({
      next: (res: any) => {
        const raw   = res?.data ?? res;
        const items: AdmsLog[] = Array.isArray(raw) ? raw : (raw?.items ?? raw?.logs ?? []);
        this.logs.set(items);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.listError.set(this.apiErr(err, 'manager.admsLogs.loadError'));
      },
    });
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.fromDate.set('');
    this.toDate.set('');
  }

  punchTime(log: AdmsLog): string {
    const t = log.punchTime ?? log.timestamp ?? log.time;
    if (!t) return '—';
    try {
      return new Date(t).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return t; }
  }

  punchDate(log: AdmsLog): string {
    const t = log.punchTime ?? log.timestamp ?? log.time;
    if (!t) return '—';
    try { return new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return t; }
  }

  punchHour(log: AdmsLog): string {
    const t = log.punchTime ?? log.timestamp ?? log.time;
    if (!t) return '—';
    try { return new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
    catch { return t; }
  }

  verifyLabel(log: AdmsLog): string {
    const v = Number(log.verifyType ?? log.status ?? -1);
    const labels: Record<number, string> = { 0: 'Fingerprint', 1: 'Card', 2: 'Badge', 3: 'Face' };
    return labels[v] ?? String(log.verifyType ?? '—');
  }

  verifyColor(log: AdmsLog): string {
    const v = Number(log.verifyType ?? -1);
    const colors: Record<number, string> = {
      0: 'rgba(99,102,241,0.85)',
      1: 'rgba(16,185,129,0.85)',
      2: 'rgba(245,158,11,0.85)',
      3: 'rgba(59,130,246,0.85)',
    };
    return colors[v] ?? 'var(--text-faint)';
  }

  verifyBg(log: AdmsLog): string {
    const v = Number(log.verifyType ?? -1);
    const bgs: Record<number, string> = {
      0: 'rgba(99,102,241,0.08)',
      1: 'rgba(16,185,129,0.08)',
      2: 'rgba(245,158,11,0.08)',
      3: 'rgba(59,130,246,0.08)',
    };
    return bgs[v] ?? 'var(--bg-subtle-sm)';
  }

  deviceSerial(log: AdmsLog): string {
    return log.deviceSerial ?? log.serialNumber ?? '—';
  }

  empNumber(log: AdmsLog): string {
    return String(log.deviceEmployeeNumber ?? log.number ?? '—');
  }

  exportCsv(): void {
    const headers = ['الرقم', 'اسم الموظف', 'رقم الموظف', 'الجهاز', 'وقت البصمة', 'طريقة التحقق'];
    const rows = this.filtered().map(l => [
      String(l.id ?? ''),
      l.employeeName ?? '',
      this.empNumber(l),
      this.deviceSerial(l),
      this.punchTime(l),
      this.verifyLabel(l),
    ]);
    this.downloadCsv([headers, ...rows], 'سجلات-البصمة');
  }

  private downloadCsv(rows: string[][], filename: string): void {
    const BOM = '﻿';
    const csv = BOM + rows
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `${filename}-${new Date().toLocaleDateString('en-CA')}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
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
    return fallback;
  }
}
