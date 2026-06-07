import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { ShiftSystemService } from '../../../core/services/shift-system.service';
import { ShiftService } from '../../../core/services/shift.service';
import {
  Shift, ShiftSystemDay, DayOfWeek,
  CreateShiftSystemDayRequest, UpdateShiftSystemDayRequest,
} from '../../../core/models/shift.models';

const ALL_DAYS: DayOfWeek[] = [
  DayOfWeek.Sunday,
  DayOfWeek.Monday,
  DayOfWeek.Tuesday,
  DayOfWeek.Wednesday,
  DayOfWeek.Thursday,
  DayOfWeek.Friday,
  DayOfWeek.Saturday,
];

@Component({
  selector: 'app-shift-system-days',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './shift-system-days.component.html',
})
export class ShiftSystemDaysComponent implements OnInit {
  private readonly systemService = inject(ShiftSystemService);
  private readonly shiftService  = inject(ShiftService);
  private readonly fb            = inject(FormBuilder);
  private readonly lang          = inject(LanguageService);
  private readonly route         = inject(ActivatedRoute);

  shiftSystemId   = 0;
  systemName      = signal<string>('');

  // ── Data ─────────────────────────────────────────────────────────────────────
  days       = signal<ShiftSystemDay[]>([]);
  allShifts  = signal<Shift[]>([]);
  loading    = signal(true);
  daysError  = signal<string | null>(null);

  // ── Flash / error ────────────────────────────────────────────────────────────
  successMsg = signal<string | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);

  // ── Modals ────────────────────────────────────────────────────────────────────
  showAddModal    = signal(false);
  showEditModal   = signal(false);
  showDeleteModal = signal(false);
  selectedDay     = signal<ShiftSystemDay | null>(null);
  deleteTargetId  = signal<number | null>(null);

  readonly ALL_DAYS  = ALL_DAYS;
  readonly DayOfWeek = DayOfWeek;

  addForm = this.fb.group({
    dayOfWeek: [DayOfWeek.Sunday, Validators.required],
    shiftId:   [null as number | null, [Validators.required, Validators.min(1)]],
  });

  editForm = this.fb.group({
    dayOfWeek: [DayOfWeek.Sunday, Validators.required],
    shiftId:   [null as number | null, [Validators.required, Validators.min(1)]],
  });

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
        this.days.set(items);
        this.daysError.set(null);
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

  // ── Day lookup ────────────────────────────────────────────────────────────────
  getDayRecord(dow: DayOfWeek): ShiftSystemDay | undefined {
    return this.days().find(d => d.dayOfWeek === dow);
  }

  dayLabel(dow: DayOfWeek): string {
    return this.lang.t(`manager.dayOfWeek.${dow}`);
  }

  // ── Add ──────────────────────────────────────────────────────────────────────
  openAdd(): void {
    this.addForm.reset({ dayOfWeek: DayOfWeek.Sunday, shiftId: null });
    this.modalError.set(null);
    this.showAddModal.set(true);
  }

  submitAdd(): void {
    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.addForm.value;
    const payload: CreateShiftSystemDayRequest = {
      dayOfWeek:      v.dayOfWeek!,
      shiftId:        v.shiftId!,
      idempotencyKey: crypto.randomUUID(),
    };
    this.systemService.createDay(this.shiftSystemId, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAddModal.set(false);
        this.flash('Day added successfully.');
        this.loadDays();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to add day.')); },
    });
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  openEdit(day: ShiftSystemDay, event: Event): void {
    event.stopPropagation();
    this.selectedDay.set(day);
    this.editForm.patchValue({ dayOfWeek: day.dayOfWeek, shiftId: day.shiftId });
    this.modalError.set(null);
    this.showEditModal.set(true);
  }

  submitEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const id = this.selectedDay()?.id;
    if (!id) return;
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.editForm.value;
    const payload: UpdateShiftSystemDayRequest = {
      dayOfWeek: v.dayOfWeek!,
      shiftId:   v.shiftId!,
    };
    this.systemService.updateDay(this.shiftSystemId, id, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showEditModal.set(false);
        this.flash('Day updated.');
        this.loadDays();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Update failed.')); },
    });
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  confirmDelete(id: number, event: Event): void {
    event.stopPropagation();
    this.deleteTargetId.set(id);
    this.showDeleteModal.set(true);
  }

  executeDelete(): void {
    const id = this.deleteTargetId();
    if (id === null) return;
    this.submitting.set(true);
    this.systemService.deleteDay(this.shiftSystemId, id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeleteModal.set(false);
        this.days.update(list => list.filter(d => d.id !== id));
        this.flash('Day removed.');
      },
      error: () => { this.submitting.set(false); this.showDeleteModal.set(false); },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  formatTime(t?: string): string {
    return t ? t.substring(0, 5) : '—';
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
