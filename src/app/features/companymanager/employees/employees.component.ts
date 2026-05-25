import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee, EmployeeType, GetEmployeesParams } from '../../../core/models/employee.models';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './employees.component.html',
})
export class EmployeesComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly fb              = inject(FormBuilder);
  private readonly lang            = inject(LanguageService);
  private readonly route           = inject(ActivatedRoute);

  branchId    = 0;
  sectionId   = 0;
  sectionName = signal<string>('');
  backUrl     = signal<string>('/dashboard/manager/branches');

  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    search:     '',
    pageNumber: 1,
    pageSize:   10,
  });

  // ── Table state ────────────────────────────────────────────────────────────
  employees = signal<Employee[]>([]);
  loading   = signal(true);
  hasMore   = signal(false);

  // ── Flash / error ──────────────────────────────────────────────────────────
  successMsg = signal<string | null>(null);
  listError  = signal<string | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);

  // ── Modals ─────────────────────────────────────────────────────────────────
  showAddModal    = signal(false);
  showEditModal   = signal(false);
  showDeleteModal = signal(false);
  selectedEmployee = signal<Employee | null>(null);
  deleteTargetId   = signal<number | null>(null);

  private readonly phonePattern = /^09\d{8}$/;

  addForm = this.fb.group({
    phoneNumber:  ['', [Validators.required, Validators.pattern(this.phonePattern)]],
    firstName:    ['', [Validators.required, Validators.maxLength(50)]],
    lastName:     ['', [Validators.required, Validators.maxLength(50)]],
    email:        ['', [Validators.email]],
    employeeType: [EmployeeType.Employee, Validators.required],
  });

  editForm = this.fb.group({
    firstName:    ['', [Validators.required, Validators.maxLength(50)]],
    lastName:     ['', [Validators.required, Validators.maxLength(50)]],
    email:        ['', [Validators.email]],
    employeeType: [EmployeeType.Employee, Validators.required],
  });

  readonly EmployeeType = EmployeeType;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.branchId  = Number(this.route.snapshot.paramMap.get('branchId'));
    this.sectionId = Number(this.route.snapshot.paramMap.get('sectionId'));
    const state = history.state as { sectionName?: string };
    if (state?.sectionName) this.sectionName.set(state.sectionName);
    if (this.branchId && this.sectionId) {
      this.backUrl.set(`/dashboard/manager/branches/${this.branchId}/sections`);
    }
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading.set(true);
    const { search, pageNumber, pageSize } = this.filter.value();
    const params: GetEmployeesParams = { pageSize, pageNumber };
    if (search.trim()) params.phoneNumber = search.trim();

    this.employeeService.getAll(params).subscribe({
      next: (res: any) => {
        this.listError.set(null);
        if (res?.isSuccess === false) {
          this.listError.set(res.message || 'Failed to load employees.');
          this.loading.set(false);
          return;
        }
        const raw = res?.data ?? res;
        const items: Employee[] = Array.isArray(raw)
          ? raw
          : (raw?.items ?? raw?.data ?? raw?.employees ?? []);
        this.employees.set(items);
        this.hasMore.set(items.length >= this.filter.value().pageSize);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.listError.set(this.apiErr(err, 'Failed to load employees.'));
      },
    });
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  onSearch(value: string): void {
    this.filter.set({ search: value });
    this.loadEmployees();
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  prevPage(): void {
    if (this.filter.value().pageNumber <= 1) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber - 1 });
    this.loadEmployees();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber + 1 });
    this.loadEmployees();
  }

  // ── Add ────────────────────────────────────────────────────────────────────
  openAdd(): void {
    this.addForm.reset({ employeeType: EmployeeType.Employee });
    this.modalError.set(null);
    this.showAddModal.set(true);
  }

  submitAdd(): void {
    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);

    const v = this.addForm.value;
    this.employeeService.create({
      phoneNumber:  v.phoneNumber!,
      firstName:    v.firstName!,
      lastName:     v.lastName!,
      email:        v.email || undefined,
      employeeType: v.employeeType!,
    }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res?.isSuccess === false) {
          this.modalError.set(res.message || 'Failed to add employee.');
          return;
        }
        if (res?.data != null || res?.id != null || res?.isSuccess === true) {
          this.showAddModal.set(false);
          this.flash('Employee added successfully!');
          this.filter.patch({ pageNumber: 1 });
          this.loadEmployees();
        } else {
          this.modalError.set(res?.message || 'Failed to add employee.');
        }
      },
      error: err => {
        this.submitting.set(false);
        this.modalError.set(this.apiErr(err, 'Failed to add employee.'));
      },
    });
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  openEdit(emp: Employee, event: Event): void {
    event.stopPropagation();
    this.selectedEmployee.set(emp);
    this.editForm.patchValue({
      firstName:    emp.firstName,
      lastName:     emp.lastName,
      email:        emp.email ?? '',
      employeeType: emp.employeeType,
    });
    this.modalError.set(null);
    this.showEditModal.set(true);
  }

  submitEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const id = this.selectedEmployee()?.id;
    if (!id) return;
    this.submitting.set(true);
    this.modalError.set(null);

    const v = this.editForm.value;
    this.employeeService.update(id, {
      firstName:    v.firstName || undefined,
      lastName:     v.lastName  || undefined,
      email:        v.email     || undefined,
      employeeType: v.employeeType!,
    }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res?.isSuccess === false) {
          this.modalError.set(res.message || 'Update failed.');
          return;
        }
        this.showEditModal.set(false);
        this.flash('Employee updated.');
        this.loadEmployees();
      },
      error: err => {
        this.submitting.set(false);
        this.modalError.set(this.apiErr(err, 'Update failed.'));
      },
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  confirmDelete(id: number, event: Event): void {
    event.stopPropagation();
    this.deleteTargetId.set(id);
    this.showDeleteModal.set(true);
  }

  executeDelete(): void {
    const id = this.deleteTargetId();
    if (id === null) return;
    this.submitting.set(true);
    this.employeeService.delete(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeleteModal.set(false);
        this.employees.update(list => list.filter(e => e.id !== id));
        this.flash('Employee deleted.');
      },
      error: () => { this.submitting.set(false); this.showDeleteModal.set(false); },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  employeeTypeLabel(type: EmployeeType): string {
    return this.lang.t(`manager.employeeTypes.${type}`);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
    if (body.errors) {
      if (Array.isArray(body.errors)) {
        const m = body.errors.map((e: any) => e?.message ?? e)
          .filter((s: any) => typeof s === 'string').join('. ');
        if (m) return m;
      } else if (typeof body.errors === 'object') {
        const m = (Object.values(body.errors) as unknown[]).flat()
          .filter((s): s is string => typeof s === 'string').join('. ');
        if (m) return m;
      }
    }
    switch (err?.status) {
      case 401: return 'Session expired. Please sign in again.';
      case 403: return 'You do not have permission.';
      case 409: return 'This employee already exists.';
      case 500: return 'Server error. Please try again later.';
      default:  return fallback;
    }
  }
}
