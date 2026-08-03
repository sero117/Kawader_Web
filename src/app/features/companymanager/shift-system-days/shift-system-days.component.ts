import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { ShiftSystemService } from '../../../core/services/shift-system.service';
import { ShiftService } from '../../../core/services/shift.service';
import { Shift, ShiftSystemDay, DayOfWeek } from '../../../core/models/shift.models';

const ALL_DAYS: DayOfWeek[] = [
  DayOfWeek.Sunday,
  DayOfWeek.Monday,
  DayOfWeek.Tuesday,
  DayOfWeek.Wednesday,
  DayOfWeek.Thursday,
  DayOfWeek.Friday,
  DayOfWeek.Saturday,
];

interface DayRow {
  dow: DayOfWeek;
  recordId: number | null;
  checked: boolean;
  shiftId: number | null;
}

@Component({
  selector: 'app-shift-system-days',
  standalone: true,
  imports: [FormsModule, TranslatePipe, RouterLink],
  templateUrl: './shift-system-days.component.html',
})
export class ShiftSystemDaysComponent implements OnInit {
  private readonly systemService = inject(ShiftSystemService);
  private readonly shiftService  = inject(ShiftService);
  private readonly lang          = inject(LanguageService);
  private readonly route         = inject(ActivatedRoute);

  shiftSystemId   = 0;
  systemName      = signal<string>('');

  // ── Data ─────────────────────────────────────────────────────────────────────
  rows       = signal<DayRow[]>([]);
  private baseline: DayRow[] = [];
  allShifts  = signal<Shift[]>([]);
  loading    = signal(true);
  daysError  = signal<string | null>(null);

  // ── Save state ───────────────────────────────────────────────────────────────
  saving     = signal(false);
  saveError  = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  readonly ALL_DAYS  = ALL_DAYS;
  readonly DayOfWeek = DayOfWeek;

  ngOnInit(): void {
    this.shiftSystemId = Number(this.route.snapshot.paramMap.get('shiftSystemId'));
    const state = history.state as { systemName?: string };
    if (state?.systemName) this.systemName.set(state.systemName);
    this.loadDays();
    this.loadShifts();
  }

  loadDays(): void {
    this.loading.set(true);
    this.systemService.getDays(this.shiftSystemId).subscribe({
      next: (res: any) => {
        const items: ShiftSystemDay[] = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
        const rows: DayRow[] = ALL_DAYS.map(dow => {
          const rec = items.find(d => d.dayOfWeek === dow);
          return { dow, recordId: rec?.id ?? null, checked: !!rec, shiftId: rec?.shiftId ?? null };
        });
        this.rows.set(rows);
        this.baseline = rows.map(r => ({ ...r }));
        this.daysError.set(null);
        this.saveError.set(null);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.daysError.set(this.apiErr(err, 'Failed to load days.'));
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

  dayLabel(dow: DayOfWeek): string {
    return this.lang.t(`manager.dayOfWeek.${dow}`);
  }

  shiftById(id: number | null): Shift | undefined {
    return id ? this.allShifts().find(s => s.id === id) : undefined;
  }

  workDaysCount(): number {
    return this.rows().filter(r => r.checked).length;
  }

  formatTime(t?: string): string {
    return t ? t.substring(0, 5) : '—';
  }

  // ── Row editing ──────────────────────────────────────────────────────────────
  toggleDay(dow: DayOfWeek): void {
    this.rows.update(rs => rs.map(r => {
      if (r.dow !== dow) return r;
      const checked = !r.checked;
      // Default to the first available shift so a freshly-checked day isn't
      // immediately invalid — the user can still change it before saving.
      const shiftId = checked ? (r.shiftId ?? this.allShifts()[0]?.id ?? null) : r.shiftId;
      return { ...r, checked, shiftId };
    }));
  }

  setShift(dow: DayOfWeek, shiftId: number | null): void {
    this.rows.update(rs => rs.map(r => r.dow === dow ? { ...r, shiftId } : r));
  }

  isDirty(): boolean {
    return this.rows().some((r, i) => {
      const b = this.baseline[i];
      return r.checked !== b.checked || (r.checked && r.shiftId !== b.shiftId);
    });
  }

  canSave(): boolean {
    return this.isDirty() && this.rows().every(r => !r.checked || !!r.shiftId) && !this.saving();
  }

  discard(): void {
    this.rows.set(this.baseline.map(r => ({ ...r })));
    this.saveError.set(null);
  }

  saveAll(): void {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.saveError.set(null);

    const ops: Observable<{ ok: boolean }>[] = [];
    this.rows().forEach((r, i) => {
      const b = this.baseline[i];
      let op: Observable<unknown> | null = null;
      if (r.checked && !b.checked) {
        op = this.systemService.createDay(this.shiftSystemId, {
          dayOfWeek: r.dow, shiftId: r.shiftId!, idempotencyKey: crypto.randomUUID(),
        });
      } else if (!r.checked && b.checked) {
        op = this.systemService.deleteDay(this.shiftSystemId, b.recordId!);
      } else if (r.checked && b.checked && r.shiftId !== b.shiftId) {
        op = this.systemService.updateDay(this.shiftSystemId, b.recordId!, {
          dayOfWeek: r.dow, shiftId: r.shiftId!,
        });
      }
      if (op) ops.push(op.pipe(map(() => ({ ok: true })), catchError(() => of({ ok: false }))));
    });

    if (!ops.length) { this.saving.set(false); return; }

    forkJoin(ops).subscribe(results => {
      this.saving.set(false);
      const failed = results.filter(r => !r.ok).length;
      if (failed) {
        this.saveError.set(`Failed to save ${failed} of ${results.length} changes.`);
      } else {
        this.flash('Days updated successfully.');
      }
      // Reload regardless — reflects whatever the server actually ended up with.
      this.loadDays();
    });
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
      case 422: return 'This day is already configured for this system.';
      case 500: return 'Server error. Please try again.';
      default:  return fallback;
    }
  }
}
