import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { ShiftService } from '../../../core/services/shift.service';
import { Shift, ShiftType, GetShiftsParams } from '../../../core/models/shift.models';

@Component({
  selector: 'app-shifts',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './shifts.component.html',
})
export class ShiftsComponent implements OnInit {
  private readonly shiftService = inject(ShiftService);
  private readonly fb           = inject(FormBuilder);
  private readonly lang         = inject(LanguageService);

  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    search:     '',
    type:       -1,
    pageNumber: 1,
    pageSize:   10,
  });

  // ── Table state ─────────────────────────────────────────────────────────────
  shifts    = signal<Shift[]>([]);
  loading   = signal(true);
  hasMore   = signal(false);

  // ── Flash / error ────────────────────────────────────────────────────────────
  successMsg = signal<string | null>(null);
  listError  = signal<string | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);

  // ── Modals ────────────────────────────────────────────────────────────────────
  showAddModal    = signal(false);
  showEditModal   = signal(false);
  showDeleteModal = signal(false);
  selectedShift   = signal<Shift | null>(null);
  deleteTargetId  = signal<number | null>(null);

  readonly ShiftType = ShiftType;

  addForm = this.fb.group({
    name:      ['', [Validators.required, Validators.maxLength(100)]],
    startTime: ['', [Validators.required]],
    endTime:   ['', [Validators.required]],
    type:      [ShiftType.Regular, Validators.required],
  });

  editForm = this.fb.group({
    name:      ['', [Validators.required, Validators.maxLength(100)]],
    startTime: ['', [Validators.required]],
    endTime:   ['', [Validators.required]],
    type:      [ShiftType.Regular, Validators.required],
  });

  ngOnInit(): void {
    this.loadShifts();
  }

  loadShifts(): void {
    this.loading.set(true);
    const { search, type, pageNumber, pageSize } = this.filter.value();
    const params: GetShiftsParams = { pageNumber, pageSize };
    if (search.trim()) params.name = search.trim();
    if (type !== -1)   params.type = type as ShiftType;

    this.shiftService.getAll(params).subscribe({
      next: (res: any) => {
        this.listError.set(null);
        const raw   = res?.data ?? res;
        const items: Shift[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const total = raw?.totalCount ?? items.length;
        this.shifts.set(items);
        this.hasMore.set(pageNumber * pageSize < total);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.listError.set(this.apiErr(err, 'Failed to load shifts.'));
      },
    });
  }

  // ── Search & Filter ──────────────────────────────────────────────────────────
  onSearch(value: string): void {
    this.filter.set({ search: value });
    this.loadShifts();
  }

  onTypeFilter(value: string): void {
    this.filter.set({ type: Number(value) });
    this.loadShifts();
  }

  // ── Pagination ───────────────────────────────────────────────────────────────
  prevPage(): void {
    if (this.filter.value().pageNumber <= 1) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber - 1 });
    this.loadShifts();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber + 1 });
    this.loadShifts();
  }

  // ── Add ──────────────────────────────────────────────────────────────────────
  openAdd(): void {
    this.addForm.reset({ type: ShiftType.Regular });
    this.modalError.set(null);
    this.showAddModal.set(true);
  }

  submitAdd(): void {
    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.addForm.value;
    this.shiftService.create({
      name:           v.name!,
      startTime:      this.toTimeString(v.startTime!),
      endTime:        this.toTimeString(v.endTime!),
      type:           v.type!,
      idempotencyKey: crypto.randomUUID(),
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAddModal.set(false);
        this.flash('Shift added successfully.');
        this.filter.patch({ pageNumber: 1 });
        this.loadShifts();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to add shift.')); },
    });
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  openEdit(shift: Shift, event: Event): void {
    event.stopPropagation();
    this.selectedShift.set(shift);
    this.editForm.patchValue({
      name:      shift.name,
      startTime: shift.startTime.substring(0, 5),
      endTime:   shift.endTime.substring(0, 5),
      type:      shift.type,
    });
    this.modalError.set(null);
    this.showEditModal.set(true);
  }

  submitEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const id = this.selectedShift()?.id;
    if (!id) return;
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.editForm.value;
    this.shiftService.update(id, {
      name:      v.name      || undefined,
      startTime: v.startTime ? this.toTimeString(v.startTime) : undefined,
      endTime:   v.endTime   ? this.toTimeString(v.endTime)   : undefined,
      type:      v.type      ?? undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showEditModal.set(false);
        this.flash('Shift updated.');
        this.loadShifts();
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
    this.shiftService.delete(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeleteModal.set(false);
        this.shifts.update(list => list.filter(s => s.id !== id));
        this.flash('Shift deleted.');
      },
      error: () => { this.submitting.set(false); this.showDeleteModal.set(false); },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  shiftTypeLabel(type: ShiftType): string {
    return this.lang.t(`manager.shiftTypes.${type}`);
  }

  formatTime(t?: string): string {
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
      case 404: return 'Shift not found.';
      case 409: return 'Shift already exists.';
      case 422: return 'Operation not allowed.';
      case 500: return 'Server error. Please try again.';
      default:  return fallback;
    }
  }
}
