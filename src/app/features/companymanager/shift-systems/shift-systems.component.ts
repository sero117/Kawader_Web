import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { ShiftSystemService } from '../../../core/services/shift-system.service';
import { ShiftSystem, GetShiftSystemsParams } from '../../../core/models/shift.models';

@Component({
  selector: 'app-shift-systems',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './shift-systems.component.html',
})
export class ShiftSystemsComponent implements OnInit {
  private readonly systemService = inject(ShiftSystemService);
  private readonly fb            = inject(FormBuilder);
  private readonly lang          = inject(LanguageService);
  private readonly router        = inject(Router);

  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    search:     '',
    pageNumber: 1,
    pageSize:   10,
  });

  // ── Table state ─────────────────────────────────────────────────────────────
  systems   = signal<ShiftSystem[]>([]);
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
  selectedSystem  = signal<ShiftSystem | null>(null);
  deleteTargetId  = signal<number | null>(null);

  addForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
  });

  editForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
  });

  ngOnInit(): void {
    this.loadSystems();
  }

  loadSystems(): void {
    this.loading.set(true);
    const { search, pageNumber, pageSize } = this.filter.value();
    const params: GetShiftSystemsParams = { pageNumber, pageSize };
    if (search.trim()) params.name = search.trim();

    this.systemService.getAll(params).subscribe({
      next: (res: any) => {
        this.listError.set(null);
        const raw   = res?.data ?? res;
        const items: ShiftSystem[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const total = raw?.totalCount ?? items.length;
        this.systems.set(items);
        this.hasMore.set(pageNumber * pageSize < total);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.listError.set(this.apiErr(err, 'Failed to load shift systems.'));
      },
    });
  }

  // ── Search ────────────────────────────────────────────────────────────────────
  onSearch(value: string): void {
    this.filter.set({ search: value });
    this.loadSystems();
  }

  // ── Pagination ────────────────────────────────────────────────────────────────
  prevPage(): void {
    if (this.filter.value().pageNumber <= 1) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber - 1 });
    this.loadSystems();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber + 1 });
    this.loadSystems();
  }

  // ── Configure Days ────────────────────────────────────────────────────────────
  openDays(system: ShiftSystem): void {
    this.router.navigate(
      ['/dashboard/manager/shift-systems', system.id, 'days'],
      { state: { systemName: system.name } },
    );
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
    this.systemService.create({
      name:           this.addForm.value.name!,
      idempotencyKey: crypto.randomUUID(),
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAddModal.set(false);
        this.flash('Shift system added successfully.');
        this.filter.patch({ pageNumber: 1 });
        this.loadSystems();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to add shift system.')); },
    });
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  openEdit(system: ShiftSystem, event: Event): void {
    event.stopPropagation();
    this.selectedSystem.set(system);
    this.editForm.patchValue({ name: system.name });
    this.modalError.set(null);
    this.showEditModal.set(true);
  }

  submitEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const id = this.selectedSystem()?.id;
    if (!id) return;
    this.submitting.set(true);
    this.modalError.set(null);
    this.systemService.update(id, { name: this.editForm.value.name! }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showEditModal.set(false);
        this.flash('Shift system updated.');
        this.loadSystems();
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
    this.systemService.delete(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeleteModal.set(false);
        this.systems.update(list => list.filter(s => s.id !== id));
        this.flash('Shift system deleted.');
      },
      error: () => { this.submitting.set(false); this.showDeleteModal.set(false); },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
      case 404: return 'Shift system not found.';
      case 409: return 'Shift system already exists.';
      case 500: return 'Server error. Please try again.';
      default:  return fallback;
    }
  }
}
