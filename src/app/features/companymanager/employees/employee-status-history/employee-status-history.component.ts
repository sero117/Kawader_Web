import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { EmployeeService } from '../../../../core/services/employee.service';
import { EmployeeStatusService } from '../../../../core/services/employee-status.service';
import { CompanyTimeService } from '../../../../core/services/company-time.service';
import {
  EmployeeStatus, EmployeeStatusHistory, CreateStatusHistoryRequest, UpdateStatusHistoryRequest,
} from '../../../../core/models/employee.models';

@Component({
  selector: 'app-employee-status-history',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './employee-status-history.component.html',
})
export class EmployeeStatusHistoryComponent implements OnInit {
  private readonly employeeService       = inject(EmployeeService);
  private readonly employeeStatusService = inject(EmployeeStatusService);
  private readonly companyTime           = inject(CompanyTimeService);
  private readonly fb                    = inject(FormBuilder);
  private readonly lang                  = inject(LanguageService);
  private readonly route                 = inject(ActivatedRoute);

  employeeId = 0;

  records         = signal<EmployeeStatusHistory[]>([]);
  loading         = signal(false);
  error           = signal<string | null>(null);
  hasMore         = signal(false);
  page            = signal(1);
  view            = signal<'list' | 'add' | 'edit'>('list');
  submitting      = signal(false);
  modalError      = signal<string | null>(null);
  selectedRecord  = signal<EmployeeStatusHistory | null>(null);
  showDeleteModal = signal(false);
  deleteTargetId  = signal<number | null>(null);

  readonly EmployeeStatusList = [
    EmployeeStatus.Probation,
    EmployeeStatus.Active,
    EmployeeStatus.Suspended,
    EmployeeStatus.Resigned,
    EmployeeStatus.Terminated,
  ];

  form = this.fb.group({
    status:    [EmployeeStatus.Active, [Validators.required]],
    startDate: ['', [Validators.required]],
    endDate:   [''],
    reason:    ['', [Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    this.employeeId = Number(this.route.parent!.snapshot.paramMap.get('employeeId'));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.employeeStatusService.getAll(this.employeeId, { pageNumber: this.page(), pageSize: 10 }).subscribe({
      next: (res: any) => {
        const raw   = res?.data ?? res;
        const items: EmployeeStatusHistory[] = raw?.items ?? [];
        const total = raw?.totalCount ?? items.length;
        this.records.set(items);
        this.hasMore.set(this.page() * 10 < total);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(this.apiErr(err, 'Failed to load status history.'));
      },
    });
  }

  prev(): void {
    if (this.page() <= 1) return;
    this.page.update(p => p - 1);
    this.load();
  }

  next(): void {
    if (!this.hasMore()) return;
    this.page.update(p => p + 1);
    this.load();
  }

  openAdd(): void {
    this.form.reset({ status: EmployeeStatus.Active });
    this.modalError.set(null);
    this.view.set('add');
  }

  openEdit(record: EmployeeStatusHistory): void {
    this.selectedRecord.set(record);
    this.form.patchValue({
      status:    record.status,
      startDate: record.startDate,
      endDate:   record.endDate ?? '',
      reason:    record.reason  ?? '',
    });
    this.modalError.set(null);
    this.view.set('edit');
  }

  submitAdd(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.form.value;
    const payload: CreateStatusHistoryRequest = {
      status:    v.status!,
      startDate: v.startDate!,
      endDate:   v.endDate  || null,
      reason:    v.reason   || null,
    };
    this.employeeStatusService.create(this.employeeId, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.view.set('list');
        this.page.set(1);
        this.load();
      },
      error: () => { this.submitting.set(false); },
    });
  }

  submitEdit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const recordId = this.selectedRecord()?.id;
    if (!recordId) return;
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.form.value;
    const payload: UpdateStatusHistoryRequest = {
      status:    v.status!,
      startDate: v.startDate!,
      endDate:   v.endDate  || null,
      reason:    v.reason   || null,
    };
    this.employeeStatusService.update(this.employeeId, recordId, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.view.set('list');
        this.load();
      },
      error: () => { this.submitting.set(false); },
    });
  }

  confirmDelete(id: number): void {
    this.deleteTargetId.set(id);
    this.showDeleteModal.set(true);
  }

  executeDelete(): void {
    const recordId = this.deleteTargetId();
    if (recordId === null) return;
    this.submitting.set(true);
    this.employeeStatusService.delete(this.employeeId, recordId).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeleteModal.set(false);
        this.records.update(list => list.filter(r => r.id !== recordId));
      },
      error: () => { this.submitting.set(false); this.showDeleteModal.set(false); },
    });
  }

  employeeStatusLabel(status: EmployeeStatus): string {
    return this.lang.t(`manager.employeeStatus.${status}`);
  }

  formatDate(dateStr?: string): string {
    return this.companyTime.formatDate(dateStr);
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
      case 401: return 'Session expired. Please sign in again.';
      case 403: return 'You do not have permission.';
      case 404: return 'Not found.';
      case 500: return 'Server error. Please try again later.';
      default:  return fallback;
    }
  }
}
