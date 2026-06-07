import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { EmployeeService } from '../../../core/services/employee.service';
import { EmployeeStatusService } from '../../../core/services/employee-status.service';
import { ShiftSystemService } from '../../../core/services/shift-system.service';
import {
  Employee, EmployeeType, EmployeeStatus, AttachmentType,
  GenderType, ContractType, RelationType,
  EmployeeStatusHistory, CreateStatusHistoryRequest, UpdateStatusHistoryRequest,
  GetEmployeesParams,
} from '../../../core/models/employee.models';
import { EmployeeShiftSystem, ShiftSystem, DayOfWeek } from '../../../core/models/shift.models';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink, DecimalPipe],
  templateUrl: './employees.component.html',
})
export class EmployeesComponent implements OnInit {
  private readonly employeeService       = inject(EmployeeService);
  private readonly employeeStatusService = inject(EmployeeStatusService);
  private readonly shiftSystemService    = inject(ShiftSystemService);
  private readonly fb                    = inject(FormBuilder);
  private readonly lang                  = inject(LanguageService);
  private readonly route                 = inject(ActivatedRoute);

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
  editLoading = signal(false);

  // ── Modals ─────────────────────────────────────────────────────────────────
  showAddModal     = signal(false);
  showEditModal    = signal(false);
  showDeleteModal  = signal(false);
  selectedEmployee = signal<Employee | null>(null);
  deleteTargetId   = signal<number | null>(null);

  // ── View modal ────────────────────────────────────────────────────────────
  showViewModal      = signal(false);
  viewEmployee       = signal<Employee | null>(null);
  viewLoading        = signal(false);

  // ── Attachments modal ─────────────────────────────────────────────────────
  showAttachModal    = signal(false);
  attachModalLoading = signal(false);
  editEmployeeDetail = signal<Employee | null>(null);
  pendingAttachType  = signal<AttachmentType | null>(null);
  uploadingType      = signal<AttachmentType | null>(null);
  deletingAttachType = signal<AttachmentType | null>(null);
  attachmentError    = signal<string | null>(null);

  // ── Shift Assignment modal ────────────────────────────────────────────────────
  showShiftModal      = signal(false);
  shiftEmployee       = signal<Employee | null>(null);
  shiftLoading        = signal(false);
  employeeShiftSystem = signal<EmployeeShiftSystem | null>(null);
  shiftError          = signal<string | null>(null);
  showAssignForm      = signal(false);
  shiftSubmitting     = signal(false);
  availableSystems    = signal<ShiftSystem[]>([]);
  selectedSystemId    = signal<number | null>(null);

  // ── Status History modal ───────────────────────────────────────────────────
  showHistoryModal       = signal(false);
  historyEmployee        = signal<Employee | null>(null);
  historyRecords         = signal<EmployeeStatusHistory[]>([]);
  historyLoading         = signal(false);
  historyError           = signal<string | null>(null);
  historyHasMore         = signal(false);
  historyPage            = signal(1);
  historyView            = signal<'list' | 'add' | 'edit'>('list');
  historySubmitting      = signal(false);
  historyModalError      = signal<string | null>(null);
  selectedHistoryRecord  = signal<EmployeeStatusHistory | null>(null);
  showHistoryDeleteModal = signal(false);
  deleteHistoryTargetId  = signal<number | null>(null);

  readonly EmployeeStatusList = [
    EmployeeStatus.Probation,
    EmployeeStatus.Active,
    EmployeeStatus.Suspended,
    EmployeeStatus.Resigned,
    EmployeeStatus.Terminated,
  ];

  historyForm = this.fb.group({
    status:    [EmployeeStatus.Active, [Validators.required]],
    startDate: ['', [Validators.required]],
    endDate:   [''],
    reason:    ['', [Validators.maxLength(500)]],
  });

  private readonly phonePattern = /^09\d{8}$/;

  readonly EmployeeType   = EmployeeType;
  readonly EmployeeStatus = EmployeeStatus;
  readonly AttachmentType = AttachmentType;
  readonly GenderType     = GenderType;
  readonly ContractType   = ContractType;
  readonly RelationType   = RelationType;

  readonly attachmentList: { type: AttachmentType; labelKey: string }[] = [
    { type: AttachmentType.IdentityPhoto,       labelKey: 'manager.attachmentTypes.0' },
    { type: AttachmentType.PersonalPhoto,       labelKey: 'manager.attachmentTypes.1' },
    { type: AttachmentType.WorkContract,        labelKey: 'manager.attachmentTypes.2' },
    { type: AttachmentType.Certificate,         labelKey: 'manager.attachmentTypes.3' },
    { type: AttachmentType.Qualifications,      labelKey: 'manager.attachmentTypes.4' },
    { type: AttachmentType.HealthCard,          labelKey: 'manager.attachmentTypes.5' },
    { type: AttachmentType.ProfessionalLicense, labelKey: 'manager.attachmentTypes.6' },
  ];

  addForm = this.fb.group({
    phoneNumber:               ['', [Validators.required, Validators.pattern(this.phonePattern)]],
    firstName:                 ['', [Validators.required, Validators.maxLength(50)]],
    lastName:                  ['', [Validators.required, Validators.maxLength(50)]],
    email:                     ['', [Validators.email]],
    employeeType:              [EmployeeType.Employee, Validators.required],
    employeeNumber:            ['', [Validators.required, Validators.maxLength(50)]],
    jobTitle:                  ['', [Validators.required, Validators.maxLength(100)]],
    birthDate:                 ['', [Validators.required]],
    gender:                    [GenderType.Male, Validators.required],
    nationality:               ['', [Validators.maxLength(100)]],
    branchId:                  [null as number | null, [Validators.min(1)]],
    sectionId:                 [null as number | null, [Validators.min(1)]],
    hireDate:                  ['', [Validators.required]],
    contractType:              [ContractType.FullTime, Validators.required],
    baseSalary:                [null as number | null, [Validators.required, Validators.min(0.01)]],
    workStartTime:             ['', [Validators.required]],
    workEndTime:               ['', [Validators.required]],
    emergencyContactRelation:  [RelationType.Father, Validators.required],
    emergencyContactPhone:     ['', [Validators.required, Validators.pattern(/^09\d{8}$/)]],
    internalNotes:             ['', [Validators.maxLength(1000)]],
  });

  editForm = this.fb.group({
    firstName:                 ['', [Validators.required, Validators.maxLength(50)]],
    lastName:                  ['', [Validators.required, Validators.maxLength(50)]],
    email:                     ['', [Validators.email]],
    employeeType:              [EmployeeType.Employee, Validators.required],
    employeeNumber:            ['', [Validators.required, Validators.maxLength(50)]],
    jobTitle:                  ['', [Validators.required, Validators.maxLength(100)]],
    birthDate:                 ['', [Validators.required]],
    gender:                    [GenderType.Male, Validators.required],
    nationality:               ['', [Validators.maxLength(100)]],
    branchId:                  [null as number | null, [Validators.min(1)]],
    sectionId:                 [null as number | null, [Validators.min(1)]],
    hireDate:                  ['', [Validators.required]],
    contractType:              [ContractType.FullTime, Validators.required],
    baseSalary:                [null as number | null, [Validators.required, Validators.min(0.01)]],
    workStartTime:             ['', [Validators.required]],
    workEndTime:               ['', [Validators.required]],
    emergencyContactRelation:  [RelationType.Father, Validators.required],
    emergencyContactPhone:     ['', [Validators.required, Validators.pattern(/^09\d{8}$/)]],
    internalNotes:             ['', [Validators.maxLength(1000)]],
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.branchId  = Number(this.route.snapshot.paramMap.get('branchId'));
    this.sectionId = Number(this.route.snapshot.paramMap.get('sectionId'));
    const state = history.state as { sectionName?: string };
    if (state?.sectionName) this.sectionName.set(state.sectionName);
    if (this.branchId && this.sectionId) {
      this.backUrl.set(`/dashboard/manager/branches/${this.branchId}/sections`);
    }
    this.watchEmployeeType(this.addForm.get('employeeType')!, this.addForm);
    this.watchEmployeeType(this.editForm.get('employeeType')!, this.editForm);
    this.loadEmployees();
  }

  private watchEmployeeType(ctrl: AbstractControl, form: ReturnType<typeof this.fb.group>): void {
    ctrl.valueChanges.subscribe((type: EmployeeType) => this.applyTypeValidation(type, form));
  }

  private applyTypeValidation(type: EmployeeType, form: ReturnType<typeof this.fb.group>): void {
    const branchCtrl  = form.get('branchId')!;
    const sectionCtrl = form.get('sectionId')!;
    const branchReq   = [Validators.required, Validators.min(1)];
    const branchOpt   = [Validators.min(1)];

    switch (type) {
      case EmployeeType.HumanResourceManager:
        branchCtrl.setValidators(branchOpt);
        sectionCtrl.setValidators(null);
        sectionCtrl.setValue(null);
        break;
      case EmployeeType.BranchManager:
        branchCtrl.setValidators(branchReq);
        sectionCtrl.setValidators(null);
        sectionCtrl.setValue(null);
        break;
      case EmployeeType.DepartmentManager:
      case EmployeeType.Employee:
      default:
        branchCtrl.setValidators(branchReq);
        sectionCtrl.setValidators([Validators.required, Validators.min(1)]);
        break;
    }
    branchCtrl.updateValueAndValidity({ emitEvent: false });
    sectionCtrl.updateValueAndValidity({ emitEvent: false });
  }

  loadEmployees(): void {
    this.loading.set(true);
    const { search, pageNumber, pageSize } = this.filter.value();
    const params: GetEmployeesParams = { pageSize, pageNumber };
    const phone = search.trim();
    if (/^09\d{8}$/.test(phone)) params.phoneNumber = phone;

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
        const total = raw?.totalCount ?? items.length;
        this.employees.set(items);
        this.hasMore.set(this.filter.value().pageNumber * this.filter.value().pageSize < total);
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
    this.addForm.reset({
      employeeType:             EmployeeType.Employee,
      gender:                   GenderType.Male,
      contractType:             ContractType.FullTime,
      emergencyContactRelation: RelationType.Father,
    });
    this.modalError.set(null);
    this.showAddModal.set(true);
  }

  submitAdd(): void {
    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);

    const v = this.addForm.value;
    this.employeeService.create({
      phoneNumber:              v.phoneNumber!,
      firstName:                v.firstName!,
      lastName:                 v.lastName!,
      email:                    v.email    || undefined,
      employeeType:             v.employeeType!,
      employeeNumber:           v.employeeNumber!,
      jobTitle:                 v.jobTitle!,
      birthDate:                v.birthDate!,
      gender:                   v.gender!,
      nationality:              v.nationality || undefined,
      branchId:                 v.branchId  ?? undefined,
      sectionId:                v.sectionId ?? undefined,
      hireDate:                 v.hireDate!,
      contractType:             v.contractType!,
      baseSalary:               v.baseSalary!,
      workStartTime:            this.toTimeString(v.workStartTime!),
      workEndTime:              this.toTimeString(v.workEndTime!),
      emergencyContactRelation: v.emergencyContactRelation!,
      emergencyContactPhone:    v.emergencyContactPhone!,
      internalNotes:            v.internalNotes || undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAddModal.set(false);
        this.flash('Employee added successfully!');
        this.filter.patch({ pageNumber: 1 });
        this.loadEmployees();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to add employee.')); },
    });
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  openEdit(emp: Employee, event: Event): void {
    event.stopPropagation();
    this.selectedEmployee.set(emp);
    this.editForm.reset();
    this.modalError.set(null);
    this.editLoading.set(true);
    this.showEditModal.set(true);

    this.employeeService.getById(emp.id).subscribe({
      next: (res: any) => {
        this.editLoading.set(false);
        const e = res?.data ?? res;
        this.editForm.patchValue({
          firstName:                e.firstName,
          lastName:                 e.lastName,
          email:                    e.email              ?? '',
          employeeType:             e.employeeType       ?? EmployeeType.Employee,
          employeeNumber:           e.employeeNumber     ?? '',
          jobTitle:                 e.jobTitle           ?? '',
          birthDate:                e.birthDate          ? e.birthDate.substring(0, 10)      : '',
          gender:                   e.gender             ?? GenderType.Male,
          nationality:              e.nationality        ?? '',
          branchId:                 e.branchId           ?? null,
          sectionId:                e.sectionId          ?? null,
          hireDate:                 e.hireDate           ? e.hireDate.substring(0, 10)       : '',
          contractType:             e.contractType       ?? ContractType.FullTime,
          baseSalary:               e.baseSalary         ?? null,
          workStartTime:            e.workStartTime      ? e.workStartTime.substring(0, 5)   : '',
          workEndTime:              e.workEndTime        ? e.workEndTime.substring(0, 5)     : '',
          emergencyContactRelation: e.emergencyContactRelation ?? RelationType.Father,
          emergencyContactPhone:    e.emergencyContactPhone    ?? '',
          internalNotes:            e.internalNotes      ?? '',
        });
      },
      error: err => {
        this.editLoading.set(false);
        this.modalError.set(this.apiErr(err, 'Failed to load employee data.'));
      },
    });
  }

  submitEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const id = this.selectedEmployee()?.id;
    if (!id) return;
    this.submitting.set(true);
    this.modalError.set(null);

    const v = this.editForm.value;
    this.employeeService.update(id, {
      firstName:                v.firstName    || undefined,
      lastName:                 v.lastName     || undefined,
      email:                    v.email        || undefined,
      employeeType:             v.employeeType ?? EmployeeType.Employee,
      employeeNumber:           v.employeeNumber || undefined,
      jobTitle:                 v.jobTitle     || undefined,
      birthDate:                v.birthDate    || undefined,
      gender:                   v.gender       ?? GenderType.Male,
      nationality:              v.nationality  || undefined,
      branchId:                 v.branchId     ?? undefined,
      sectionId:                v.sectionId    ?? undefined,
      hireDate:                 v.hireDate     || undefined,
      contractType:             v.contractType ?? ContractType.FullTime,
      baseSalary:               v.baseSalary   ?? undefined,
      workStartTime:            v.workStartTime ? this.toTimeString(v.workStartTime) : undefined,
      workEndTime:              v.workEndTime   ? this.toTimeString(v.workEndTime)   : undefined,
      emergencyContactRelation: v.emergencyContactRelation ?? RelationType.Father,
      emergencyContactPhone:    v.emergencyContactPhone    || undefined,
      internalNotes:            v.internalNotes || undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showEditModal.set(false);
        this.flash('Employee updated.');
        this.loadEmployees();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Update failed.')); },
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

  // ── View modal ────────────────────────────────────────────────────────────
  openView(emp: Employee): void {
    this.viewEmployee.set(emp);
    this.viewLoading.set(true);
    this.showViewModal.set(true);
    this.employeeService.getById(emp.id).subscribe({
      next: (res: any) => {
        this.viewLoading.set(false);
        this.viewEmployee.set((res?.data ?? res) as Employee);
      },
      error: () => this.viewLoading.set(false),
    });
  }

  // ── Shift Assignment ──────────────────────────────────────────────────────────
  openShift(emp: Employee, event: Event): void {
    event.stopPropagation();
    this.shiftEmployee.set(emp);
    this.shiftError.set(null);
    this.showAssignForm.set(false);
    this.selectedSystemId.set(null);
    this.employeeShiftSystem.set(null);
    this.showShiftModal.set(true);
    this.shiftLoading.set(true);

    this.shiftSystemService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res: any) => {
        const raw  = res?.data ?? res;
        const list: ShiftSystem[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        this.availableSystems.set(list);
      },
      error: () => {},
    });

    this.shiftSystemService.getEmployeeShiftSystem(emp.id).subscribe({
      next: (res: any) => {
        this.shiftLoading.set(false);
        this.employeeShiftSystem.set(res?.data ?? res);
      },
      error: (err) => {
        this.shiftLoading.set(false);
        if (err?.status === 404) {
          this.employeeShiftSystem.set(null);
        } else {
          this.shiftError.set(this.apiErr(err, 'Failed to load shift assignment.'));
        }
      },
    });
  }

  openAssignForm(): void {
    this.selectedSystemId.set(null);
    this.showAssignForm.set(true);
    this.shiftSubmitting.set(true);
    const emp = this.shiftEmployee();
    if (!emp) return;
    this.shiftSystemService.unassignEmployee(emp.id).subscribe({
      next: () => {
        this.shiftSubmitting.set(false);
        this.employeeShiftSystem.set(null);
      },
      error: (err) => {
        this.shiftSubmitting.set(false);
        this.shiftError.set(this.apiErr(err, 'Failed to unassign.'));
        this.showAssignForm.set(false);
      },
    });
  }

  submitAssign(): void {
    const systemId = this.selectedSystemId();
    const emp      = this.shiftEmployee();
    if (!systemId || !emp) return;
    this.shiftSubmitting.set(true);
    this.shiftError.set(null);
    this.shiftSystemService.assignEmployee(emp.id, {
      shiftSystemId:  systemId,
      idempotencyKey: crypto.randomUUID(),
    }).subscribe({
      next: () => {
        this.shiftSubmitting.set(false);
        this.showAssignForm.set(false);
        this.selectedSystemId.set(null);
        this.shiftLoading.set(true);
        this.shiftSystemService.getEmployeeShiftSystem(emp.id).subscribe({
          next: (res: any) => { this.shiftLoading.set(false); this.employeeShiftSystem.set(res?.data ?? res); },
          error: ()         => { this.shiftLoading.set(false); },
        });
        this.flash('Shift system assigned.');
      },
      error: (err) => {
        this.shiftSubmitting.set(false);
        this.shiftError.set(this.apiErr(err, 'Failed to assign shift system.'));
      },
    });
  }

  executeUnassign(): void {
    const emp = this.shiftEmployee();
    if (!emp) return;
    this.shiftSubmitting.set(true);
    this.shiftError.set(null);
    this.shiftSystemService.unassignEmployee(emp.id).subscribe({
      next: () => {
        this.shiftSubmitting.set(false);
        this.employeeShiftSystem.set(null);
        this.flash('Shift assignment removed.');
      },
      error: (err) => {
        this.shiftSubmitting.set(false);
        this.shiftError.set(this.apiErr(err, 'Failed to remove assignment.'));
      },
    });
  }

  dayLabel(dow: DayOfWeek): string {
    return this.lang.t(`manager.dayOfWeek.${dow}`);
  }

  // ── Attachments modal open ─────────────────────────────────────────────────
  openAttach(emp: Employee, event: Event): void {
    event.stopPropagation();
    this.editEmployeeDetail.set(emp);
    this.attachmentError.set(null);
    this.attachModalLoading.set(true);
    this.showAttachModal.set(true);

    this.employeeService.getById(emp.id).subscribe({
      next: (res: any) => {
        this.attachModalLoading.set(false);
        this.editEmployeeDetail.set((res?.data ?? res) as Employee);
      },
      error: () => this.attachModalLoading.set(false),
    });
  }

  // ── Status History ─────────────────────────────────────────────────────────
  openHistory(emp: Employee, event: Event): void {
    event.stopPropagation();
    this.historyEmployee.set(emp);
    this.historyPage.set(1);
    this.historyView.set('list');
    this.historyError.set(null);
    this.showHistoryModal.set(true);
    this.loadHistory();
  }

  loadHistory(): void {
    const empId = this.historyEmployee()?.id;
    if (!empId) return;
    this.historyLoading.set(true);
    this.employeeStatusService.getAll(empId, { pageNumber: this.historyPage(), pageSize: 10 }).subscribe({
      next: (res: any) => {
        const raw   = res?.data ?? res;
        const items: EmployeeStatusHistory[] = raw?.items ?? [];
        const total = raw?.totalCount ?? items.length;
        this.historyRecords.set(items);
        this.historyHasMore.set(this.historyPage() * 10 < total);
        this.historyLoading.set(false);
      },
      error: err => {
        this.historyLoading.set(false);
        this.historyError.set(this.apiErr(err, 'Failed to load status history.'));
      },
    });
  }

  historyPrev(): void {
    if (this.historyPage() <= 1) return;
    this.historyPage.update(p => p - 1);
    this.loadHistory();
  }

  historyNext(): void {
    if (!this.historyHasMore()) return;
    this.historyPage.update(p => p + 1);
    this.loadHistory();
  }

  openHistoryAdd(): void {
    this.historyForm.reset({ status: EmployeeStatus.Active });
    this.historyModalError.set(null);
    this.historyView.set('add');
  }

  openHistoryEdit(record: EmployeeStatusHistory): void {
    this.selectedHistoryRecord.set(record);
    this.historyForm.patchValue({
      status:    record.status,
      startDate: record.startDate,
      endDate:   record.endDate ?? '',
      reason:    record.reason  ?? '',
    });
    this.historyModalError.set(null);
    this.historyView.set('edit');
  }

  submitHistoryAdd(): void {
    if (this.historyForm.invalid) { this.historyForm.markAllAsTouched(); return; }
    const empId = this.historyEmployee()?.id;
    if (!empId) return;
    this.historySubmitting.set(true);
    this.historyModalError.set(null);
    const v = this.historyForm.value;
    const payload: CreateStatusHistoryRequest = {
      status:    v.status!,
      startDate: v.startDate!,
      endDate:   v.endDate  || null,
      reason:    v.reason   || null,
    };
    this.employeeStatusService.create(empId, payload).subscribe({
      next: () => {
        this.historySubmitting.set(false);
        this.historyView.set('list');
        this.historyPage.set(1);
        this.loadHistory();
      },
      error: err => {
        this.historySubmitting.set(false);
        this.historyModalError.set(this.apiErr(err, 'Failed to add status.'));
      },
    });
  }

  submitHistoryEdit(): void {
    if (this.historyForm.invalid) { this.historyForm.markAllAsTouched(); return; }
    const empId    = this.historyEmployee()?.id;
    const recordId = this.selectedHistoryRecord()?.id;
    if (!empId || !recordId) return;
    this.historySubmitting.set(true);
    this.historyModalError.set(null);
    const v = this.historyForm.value;
    const payload: UpdateStatusHistoryRequest = {
      status:    v.status!,
      startDate: v.startDate!,
      endDate:   v.endDate  || null,
      reason:    v.reason   || null,
    };
    this.employeeStatusService.update(empId, recordId, payload).subscribe({
      next: () => {
        this.historySubmitting.set(false);
        this.historyView.set('list');
        this.loadHistory();
      },
      error: err => {
        this.historySubmitting.set(false);
        this.historyModalError.set(this.apiErr(err, 'Failed to update status.'));
      },
    });
  }

  confirmHistoryDelete(id: number): void {
    this.deleteHistoryTargetId.set(id);
    this.showHistoryDeleteModal.set(true);
  }

  executeHistoryDelete(): void {
    const empId    = this.historyEmployee()?.id;
    const recordId = this.deleteHistoryTargetId();
    if (!empId || recordId === null) return;
    this.historySubmitting.set(true);
    this.employeeStatusService.delete(empId, recordId).subscribe({
      next: () => {
        this.historySubmitting.set(false);
        this.showHistoryDeleteModal.set(false);
        this.historyRecords.update(list => list.filter(r => r.id !== recordId));
      },
      error: () => { this.historySubmitting.set(false); this.showHistoryDeleteModal.set(false); },
    });
  }

  // ── Attachments ────────────────────────────────────────────────────────────
  triggerAttachmentUpload(type: AttachmentType): void {
    this.pendingAttachType.set(type);
    this.attachmentError.set(null);
    const input = document.getElementById('emp-att-input') as HTMLInputElement | null;
    if (input) { input.value = ''; input.click(); }
  }

  onAttachmentFile(event: Event): void {
    const type = this.pendingAttachType();
    if (type === null) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      this.attachmentError.set(this.lang.t('manager.editEmployee.fileTypeError'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.attachmentError.set(this.lang.t('manager.editEmployee.fileSizeError'));
      return;
    }

    const empId = this.editEmployeeDetail()?.id;
    if (!empId) return;
    this.uploadingType.set(type);
    this.attachmentError.set(null);

    this.employeeService.uploadAttachment(empId, file, type).subscribe({
      next: (url: string) => {
        this.uploadingType.set(null);
        this.editEmployeeDetail.update(emp =>
          emp ? { ...emp, ...this.attachUrlPatch(type, url) } : emp
        );
      },
      error: err => {
        this.uploadingType.set(null);
        this.attachmentError.set(this.apiErr(err, 'Failed to upload file.'));
      },
    });
  }

  removeAttachment(type: AttachmentType): void {
    const empId = this.editEmployeeDetail()?.id;
    if (!empId) return;
    this.deletingAttachType.set(type);
    this.attachmentError.set(null);

    this.employeeService.deleteAttachment(empId, type).subscribe({
      next: () => {
        this.deletingAttachType.set(null);
        this.editEmployeeDetail.update(emp =>
          emp ? { ...emp, ...this.attachUrlPatch(type, undefined) } : emp
        );
      },
      error: err => {
        this.deletingAttachType.set(null);
        this.attachmentError.set(this.apiErr(err, 'Failed to delete file.'));
      },
    });
  }

  getAttachmentUrl(type: AttachmentType): string | undefined {
    const emp = this.editEmployeeDetail();
    if (!emp) return undefined;
    const map: Record<AttachmentType, keyof Employee> = {
      [AttachmentType.IdentityPhoto]:       'identityPhotoUrl',
      [AttachmentType.PersonalPhoto]:       'personalPhotoUrl',
      [AttachmentType.WorkContract]:        'workContractUrl',
      [AttachmentType.Certificate]:         'certificateUrl',
      [AttachmentType.Qualifications]:      'qualificationsUrl',
      [AttachmentType.HealthCard]:          'healthCardUrl',
      [AttachmentType.ProfessionalLicense]: 'professionalLicenseUrl',
    };
    return emp[map[type]] as string | undefined;
  }

  isPdf(url: string): boolean {
    return url.toLowerCase().includes('.pdf');
  }

  getAttachmentUrlFromEmployee(emp: Employee, type: AttachmentType): string | undefined {
    const map: Record<AttachmentType, keyof Employee> = {
      [AttachmentType.IdentityPhoto]:       'identityPhotoUrl',
      [AttachmentType.PersonalPhoto]:       'personalPhotoUrl',
      [AttachmentType.WorkContract]:        'workContractUrl',
      [AttachmentType.Certificate]:         'certificateUrl',
      [AttachmentType.Qualifications]:      'qualificationsUrl',
      [AttachmentType.HealthCard]:          'healthCardUrl',
      [AttachmentType.ProfessionalLicense]: 'professionalLicenseUrl',
    };
    return emp[map[type]] as string | undefined;
  }

  private attachUrlPatch(type: AttachmentType, url: string | undefined): Partial<Employee> {
    const map: Record<AttachmentType, keyof Employee> = {
      [AttachmentType.IdentityPhoto]:       'identityPhotoUrl',
      [AttachmentType.PersonalPhoto]:       'personalPhotoUrl',
      [AttachmentType.WorkContract]:        'workContractUrl',
      [AttachmentType.Certificate]:         'certificateUrl',
      [AttachmentType.Qualifications]:      'qualificationsUrl',
      [AttachmentType.HealthCard]:          'healthCardUrl',
      [AttachmentType.ProfessionalLicense]: 'professionalLicenseUrl',
    };
    return { [map[type]]: url };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  employeeTypeLabel(type: EmployeeType): string {
    return this.lang.t(`manager.employeeTypes.${type}`);
  }

  employeeStatusLabel(status: EmployeeStatus | undefined): string {
    if (status === undefined || status === null) return '—';
    return this.lang.t(`manager.employeeStatus.${status}`);
  }

  contractTypeLabel(type: ContractType): string {
    return this.lang.t(`manager.contractTypes.${type}`);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Ensures time is sent as HH:mm:ss (API requirement)
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
      case 404: return 'Employee not found.';
      case 409: return 'This employee already exists.';
      case 412: return 'No changes detected or record already deleted.';
      case 500: return 'Server error. Please try again later.';
      default:  return fallback;
    }
  }
}
