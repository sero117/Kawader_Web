import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { CompanyHolidayService } from '../../../core/services/company-holiday.service';
import {
  CompanyHoliday, HolidayRecurrence, GetCompanyHolidaysParams,
} from '../../../core/models/company-holiday.models';

@Component({
  selector: 'app-company-holidays',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './company-holidays.component.html',
})
export class CompanyHolidaysComponent implements OnInit {
  private readonly holidayService = inject(CompanyHolidayService);
  private readonly fb             = inject(FormBuilder);
  private readonly lang           = inject(LanguageService);

  readonly HolidayRecurrence = HolidayRecurrence;
  readonly recurrenceList = [HolidayRecurrence.None, HolidayRecurrence.Yearly];

  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    name:       '',
    year:       '',
    pageNumber: 1,
    pageSize:   10,
  });

  // ── Data ─────────────────────────────────────────────────────────────────────
  holidays = signal<CompanyHoliday[]>([]);
  loading  = signal(true);
  hasMore  = signal(false);

  // ── Flash / error ────────────────────────────────────────────────────────────
  successMsg = signal<string | null>(null);
  listError  = signal<string | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);

  // ── Modals ────────────────────────────────────────────────────────────────────
  showAddModal    = signal(false);
  showEditModal   = signal(false);
  showDeleteModal = signal(false);
  selectedHoliday = signal<CompanyHoliday | null>(null);
  deleteTargetId  = signal<number | null>(null);

  addForm = this.fb.group({
    name:              ['', [Validators.required, Validators.maxLength(200)]],
    date:              ['', [Validators.required]],
    holidayRecurrence: [HolidayRecurrence.None, [Validators.required]],
    isPaid:            [true, [Validators.required]],
  });

  editForm = this.fb.group({
    name:              ['', [Validators.required, Validators.maxLength(200)]],
    date:              ['', [Validators.required]],
    holidayRecurrence: [HolidayRecurrence.None, [Validators.required]],
    isPaid:            [true, [Validators.required]],
  });

  ngOnInit(): void {
    this.loadHolidays();
  }

  loadHolidays(): void {
    this.loading.set(true);
    const { name, year, pageNumber, pageSize } = this.filter.value();
    const params: GetCompanyHolidaysParams = { pageNumber, pageSize };
    if (name) params.name = name;
    if (year) params.year = Number(year);

    this.holidayService.getAll(params).subscribe({
      next: (res: any) => {
        this.listError.set(null);
        const raw   = res?.data ?? res;
        const items: CompanyHoliday[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const total = raw?.totalCount ?? items.length;
        this.holidays.set(items);
        this.hasMore.set(pageNumber * pageSize < total);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.listError.set(this.apiErr(err, 'Failed to load holidays.'));
      },
    });
  }

  // ── Filter & Pagination ───────────────────────────────────────────────────────
  applyFilter(): void {
    this.filter.patch({ pageNumber: 1 });
    this.loadHolidays();
  }

  prevPage(): void {
    if (this.filter.value().pageNumber <= 1) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber - 1 });
    this.loadHolidays();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber + 1 });
    this.loadHolidays();
  }

  // ── Add ──────────────────────────────────────────────────────────────────────
  openAdd(): void {
    this.addForm.reset({ holidayRecurrence: HolidayRecurrence.None, isPaid: true });
    this.modalError.set(null);
    this.showAddModal.set(true);
  }

  submitAdd(): void {
    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.addForm.value;
    this.holidayService.create({
      name:              v.name!,
      date:              v.date!,
      holidayRecurrence: v.holidayRecurrence!,
      isPaid:            v.isPaid!,
      idempotencyKey:    crypto.randomUUID(),
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAddModal.set(false);
        this.flash(this.lang.t('manager.companyHolidays.added'));
        this.filter.patch({ pageNumber: 1 });
        this.loadHolidays();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to add holiday.')); },
    });
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  openEdit(holiday: CompanyHoliday, event: Event): void {
    event.stopPropagation();
    this.selectedHoliday.set(holiday);
    this.editForm.patchValue({
      name:              holiday.name,
      date:              holiday.date,
      holidayRecurrence: holiday.holidayRecurrence,
      isPaid:            holiday.isPaid,
    });
    this.modalError.set(null);
    this.showEditModal.set(true);
  }

  submitEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const holiday = this.selectedHoliday();
    if (!holiday) return;
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.editForm.value;
    this.holidayService.update(holiday.id, {
      name:              v.name!,
      date:              v.date!,
      holidayRecurrence: v.holidayRecurrence!,
      isPaid:            v.isPaid!,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showEditModal.set(false);
        this.flash(this.lang.t('manager.companyHolidays.updated'));
        this.loadHolidays();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to update holiday.')); },
    });
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  confirmDelete(holiday: CompanyHoliday, event: Event): void {
    event.stopPropagation();
    this.deleteTargetId.set(holiday.id);
    this.showDeleteModal.set(true);
  }

  executeDelete(): void {
    const id = this.deleteTargetId();
    if (!id) return;
    this.submitting.set(true);
    this.holidayService.delete(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeleteModal.set(false);
        this.holidays.update(list => list.filter(h => h.id !== id));
        this.flash(this.lang.t('manager.companyHolidays.deleted'));
      },
      error: () => { this.submitting.set(false); this.showDeleteModal.set(false); },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  recurrenceLabel(r: HolidayRecurrence): string {
    return this.lang.t(`manager.holidayRecurrence.${r}`);
  }

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
      case 404: return 'Holiday not found.';
      case 409: return 'A holiday with this key already exists.';
      case 500: return 'Server error. Please try again.';
      default:  return fallback;
    }
  }
}
