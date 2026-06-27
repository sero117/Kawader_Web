import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { UrlFilter } from '../../../../core/utils/url-filter';
import { PayrollService } from '../../../../core/services/payroll.service';
import { PayrollRun, PayrollStatus } from '../../../../core/models/payroll.models';

function periodRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('periodStart')?.value;
  const end   = group.get('periodEnd')?.value;
  return start && end && end < start ? { periodRange: true } : null;
}

@Component({
  selector: 'app-payroll-list',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './payroll-list.component.html',
})
export class PayrollListComponent implements OnInit {
  private readonly payrollService = inject(PayrollService);
  private readonly fb             = inject(FormBuilder);
  private readonly router         = inject(Router);

  readonly STATUSES: PayrollStatus[] = ['Draft', 'Approved', 'Paid'];

  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    status:     '',
    pageNumber: 1,
    pageSize:   10,
  });

  runs       = signal<PayrollRun[]>([]);
  loading    = signal(true);
  hasMore    = signal(false);
  listError  = signal<string | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);

  showCreateModal = signal(false);
  showDeleteModal = signal(false);
  deleteTargetId  = signal<number | null>(null);

  createForm = this.fb.group({
    periodStart: ['', [Validators.required]],
    periodEnd:   ['', [Validators.required]],
  }, { validators: periodRangeValidator });

  ngOnInit(): void { this.loadRuns(); }

  loadRuns(): void {
    this.loading.set(true);
    const { status, pageNumber, pageSize } = this.filter.value();
    this.payrollService.getAll({
      pageNumber,
      pageSize,
      status: (status || null) as PayrollStatus | null,
    }).subscribe({
      next: res => {
        this.listError.set(null);
        this.runs.set(res.items);
        this.hasMore.set(res.hasNextPage);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.listError.set(this.apiErr(err, 'Failed to load payroll runs.'));
      },
    });
  }

  onStatusFilterChange(value: string): void {
    this.filter.set({ status: value });
    this.loadRuns();
  }

  prevPage(): void {
    if (this.filter.value().pageNumber <= 1) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber - 1 });
    this.loadRuns();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber + 1 });
    this.loadRuns();
  }

  goToDetail(run: PayrollRun): void {
    this.router.navigate(['/dashboard/manager/payroll', run.id]);
  }

  openCreate(): void {
    this.createForm.reset();
    this.modalError.set(null);
    this.showCreateModal.set(true);
  }

  submitCreate(): void {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.createForm.value;
    this.payrollService.create({
      periodStart:    v.periodStart!,
      periodEnd:      v.periodEnd!,
      idempotencyKey: crypto.randomUUID(),
    }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res?.isSuccess === false) {
          this.modalError.set(res.message || 'Failed to create payroll run.');
          return;
        }
        this.showCreateModal.set(false);
        // API may return flat {id} or wrapped {data:{id}} — handle both.
        const id: number | undefined = res?.data?.id ?? res?.id;
        if (id != null && !isNaN(id)) {
          this.router.navigate(['/dashboard/manager/payroll', id]);
        } else {
          this.loadRuns();
        }
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to create payroll run.')); },
    });
  }

  confirmDelete(id: number, event: Event): void {
    event.stopPropagation();
    this.deleteTargetId.set(id);
    this.showDeleteModal.set(true);
  }

  executeDelete(): void {
    const id = this.deleteTargetId();
    if (id === null) return;
    this.submitting.set(true);
    this.payrollService.delete(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeleteModal.set(false);
        this.runs.update(list => list.filter(r => r.id !== id));
      },
      error: () => { this.submitting.set(false); this.showDeleteModal.set(false); },
    });
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
    for (const key of ['message', 'title', 'detail', 'error']) {
      const v = body[key];
      if (typeof v === 'string' && v.trim() && v.length < 400) return v.trim();
    }
    switch (err?.status) {
      case 401: return 'Session expired.';
      case 403: return 'You do not have permission.';
      case 404: return 'Payroll run not found.';
      case 409: return 'This period overlaps an existing payroll run.';
      case 412: return 'This payroll run can no longer be modified.';
      case 500: return 'Server error. Please try again later.';
      default:  return fallback;
    }
  }
}
