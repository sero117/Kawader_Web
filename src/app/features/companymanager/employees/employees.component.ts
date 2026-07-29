import { Component, signal, inject, OnInit, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { EmployeeService } from '../../../core/services/employee.service';
import { EmployeeStatusService } from '../../../core/services/employee-status.service';
import { ShiftSystemService } from '../../../core/services/shift-system.service';
import { ShiftService } from '../../../core/services/shift.service';
import { BranchService } from '../../../core/services/branch.service';
import { SectionService } from '../../../core/services/section.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { Branch } from '../../../core/models/branch.models';
import { Section } from '../../../core/models/section.models';
import { Currency } from '../../../core/models/currency.models';
import {
  Employee, EmployeeType, EmployeeStatus, AttachmentType,
  GenderType, ContractType, RelationType,
  EmployeeStatusHistory, CreateStatusHistoryRequest, UpdateStatusHistoryRequest,
  GetEmployeesParams,
  EmergencyContact, CreateEmergencyContactRequest,
} from '../../../core/models/employee.models';
import { EmployeeShiftSystem, ShiftSystem, DayOfWeek } from '../../../core/models/shift.models';
import { formatCurrencyAmount } from '../../../core/utils/currency-format';
import { digitsOnlyInput } from '../../../core/utils/phone-input';
import { lettersOnlyInput } from '../../../core/utils/letters-only-input';
import { CompanyTimeService } from '../../../core/services/company-time.service';

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
  private readonly shiftService          = inject(ShiftService);
  private readonly branchService         = inject(BranchService);
  private readonly sectionService        = inject(SectionService);
  private readonly currencyService       = inject(CurrencyService);
  private readonly fb                    = inject(FormBuilder);
  private readonly lang                  = inject(LanguageService);
  private readonly route                 = inject(ActivatedRoute);
  private readonly router                = inject(Router);
  private readonly companyTime           = inject(CompanyTimeService);

  branchId    = 0;
  sectionId   = 0;
  dashboardBase = '/dashboard/manager';
  sectionName  = signal<string>('');
  backUrl      = signal<string>('/dashboard/manager/branches');
  formBranches = signal<Branch[]>([]);
  addSections  = signal<Section[]>([]);
  editSections = signal<Section[]>([]);
  myCurrencies = signal<Currency[]>([]);
  currencyLoadError = signal<string | null>(null);
  originalEditCurrencyId = signal<number | null>(null);

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
  /** GET /Employees/{id} never returns work hours — they only exist per
   *  weekday on the employee's assigned shift system. Holds today's entry
   *  (in the company's own timezone), or null if unassigned / no shift
   *  configured for today. */
  viewEmployeeTodayShift = signal<{ startTime: string; endTime: string } | null>(null);
  viewBranchName  = signal<string | null>(null);
  viewSectionName = signal<string | null>(null);

  // ── Emergency Contacts (inside view modal) ────────────────────────────────
  emContacts         = signal<EmergencyContact[]>([]);
  emContactsLoading  = signal(false);
  emContactsError    = signal<string | null>(null);
  emContactsView     = signal<'list' | 'add' | 'edit'>('list');
  emContactsSubmitting = signal(false);
  emContactsModalError = signal<string | null>(null);
  emEditContact      = signal<EmergencyContact | null>(null);
  emDeleteTargetId   = signal<number | null>(null);
  showEmDeleteModal  = signal(false);

  emContactForm = this.fb.group({
    name:     ['', [Validators.required, Validators.maxLength(100)]],
    phone:    ['', [Validators.required, Validators.pattern(/^09\d{8}$/)]],
    relation: [RelationType.Father, Validators.required],
    priority: [1, [Validators.required, Validators.min(1)]],
  });

  // ── Attachments modal ─────────────────────────────────────────────────────
  showAttachModal    = signal(false);
  attachModalLoading = signal(false);
  editEmployeeDetail = signal<Employee | null>(null);
  pendingAttachType  = signal<AttachmentType | null>(null);
  uploadingType      = signal<AttachmentType | null>(null);
  deletingAttachType = signal<AttachmentType | null>(null);
  attachmentError    = signal<string | null>(null);
  attachedTypes      = signal<Set<AttachmentType>>(new Set());
  attachmentUrls     = signal<Map<AttachmentType, string>>(new Map());
  previewImageUrl    = signal<string | null>(null);
  // Cache persists for the lifetime of the component (page session)
  private readonly attachCache = new Map<number, Set<AttachmentType>>();

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

  readonly EmployeeType     = EmployeeType;
  readonly EmployeeStatus   = EmployeeStatus;
  readonly AttachmentType   = AttachmentType;

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
    phoneNumber:    ['', [Validators.required, Validators.pattern(this.phonePattern)]],
    firstName:      ['', [Validators.required, Validators.maxLength(50)]],
    lastName:       ['', [Validators.required, Validators.maxLength(50)]],
    email:          ['', [Validators.email]],
    employeeRole:   [EmployeeType.Employee, Validators.required],
    employeeNumber: ['', [Validators.required, Validators.maxLength(50)]],
    jobTitle:       ['', [Validators.required, Validators.maxLength(100)]],
    birthDate:      ['', [Validators.required]],
    gender:         [GenderType.Male, Validators.required],
    nationality:    ['', [Validators.maxLength(100)]],
    branchId:       [null as number | null, [Validators.min(1)]],
    sectionId:      [null as number | null, [Validators.min(1)]],
    hireDate:       ['', [Validators.required]],
    contractType:   [ContractType.FullTime, Validators.required],
    baseSalary:     [null as number | null, [Validators.required, Validators.min(0.01)]],
    currencyId:     [null as number | null, [Validators.required]],
    internalNotes:  ['', [Validators.maxLength(1000)]],
  });

  editForm = this.fb.group({
    firstName:      ['', [Validators.required, Validators.maxLength(50)]],
    lastName:       ['', [Validators.required, Validators.maxLength(50)]],
    email:          ['', [Validators.email]],
    employeeRole:   [EmployeeType.Employee, Validators.required],
    employeeNumber: ['', [Validators.required, Validators.maxLength(50)]],
    jobTitle:       ['', [Validators.required, Validators.maxLength(100)]],
    birthDate:      ['', [Validators.required]],
    gender:         [GenderType.Male, Validators.required],
    nationality:    ['', [Validators.maxLength(100)]],
    branchId:       [null as number | null, [Validators.min(1)]],
    sectionId:      [null as number | null, [Validators.min(1)]],
    hireDate:       ['', [Validators.required]],
    contractType:   [ContractType.FullTime, Validators.required],
    baseSalary:     [null as number | null, [Validators.required, Validators.min(0.01)]],
    currencyId:     [null as number | null, [Validators.required]],
    internalNotes:  ['', [Validators.maxLength(1000)]],
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Silent — /currencies/me returns an empty array (not an error) when the
    // Admin hasn't granted this company any currency yet; we show our own
    // friendly empty-state message for that instead of a blank dropdown.
    this.currencyService.getMe(true).subscribe({
      next: list => {
        this.myCurrencies.set(list ?? []);
        this.currencyLoadError.set(list?.length ? null : this.lang.t('errors.noCurrenciesGrantedForCompany'));
      },
      error: () => {
        this.myCurrencies.set([]);
        this.currencyLoadError.set(this.lang.t('errors.noCurrenciesGrantedForCompany'));
      },
    });
    this.branchId  = Number(this.route.snapshot.paramMap.get('branchId'));
    this.sectionId = Number(this.route.snapshot.paramMap.get('sectionId'));
    const state = history.state as { sectionName?: string };
    if (state?.sectionName) this.sectionName.set(state.sectionName);
    const base = this.router.url.startsWith('/dashboard/hr') ? '/dashboard/hr' : '/dashboard/manager';
    this.dashboardBase = base;
    this.backUrl.set(`${base}/branches`);
    if (this.branchId && this.sectionId) {
      this.backUrl.set(`${base}/branches/${this.branchId}/sections`);
    }
    this.watchEmployeeType(this.addForm.get('employeeRole')!, this.addForm);
    this.watchEmployeeType(this.editForm.get('employeeRole')!, this.editForm);
    this.loadEmployees();
    this.branchService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res;
        this.formBranches.set(Array.isArray(raw) ? raw : (raw?.items ?? []));
      },
      error: () => {},
    });
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
    if (this.branchId) params.branchId = this.branchId;
    // Backend has no SectionId filter — fetch all branch employees and filter client-side
    if (this.sectionId) { params.pageSize = 100; params.pageNumber = 1; }

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

        if (this.branchId) {
          // HR oversees the whole company, not one branch — a branch-
          // filtered backend query never returns them (they have no
          // branchId of their own), so they'd silently vanish from every
          // branch/section view. Resolve and merge them in separately.
          this.resolveBranchScopedView(items);
          return;
        }

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

  private resolveBranchScopedView(branchItems: Employee[]): void {
    this.employeeService.getAll({ pageSize: 100, pageNumber: 1 }).pipe(
      catchError(() => of(null)),
    ).subscribe((hrRes: any) => {
      const hrRaw = hrRes?.data ?? hrRes;
      const hrAll: Employee[] = Array.isArray(hrRaw) ? hrRaw : (hrRaw?.items ?? hrRaw?.data ?? hrRaw?.employees ?? []);
      const hrEmployees = hrAll.filter(e => e.employeeRole === EmployeeType.HumanResourceManager);

      if (this.sectionId) {
        this.filterBySectionViaDetails(branchItems, hrEmployees);
        return;
      }

      const merged = [...branchItems];
      for (const hr of hrEmployees) if (!merged.some(e => e.id === hr.id)) merged.push(hr);
      this.employees.set(merged);
      this.hasMore.set(false);
      this.loading.set(false);
    });
  }

  private filterBySectionViaDetails(items: Employee[], hrEmployees: Employee[] = []): void {
    const finish = (matched: Employee[]) => {
      const merged = [...matched];
      for (const hr of hrEmployees) if (!merged.some(e => e.id === hr.id)) merged.push(hr);
      this.employees.set(merged);
      this.hasMore.set(false);
      this.loading.set(false);
    };
    if (!items.length) { finish([]); return; }
    forkJoin(
      items.map(e => this.employeeService.getById(e.id).pipe(catchError(() => of(null))))
    ).subscribe(results => {
      const matched: Employee[] = [];
      results.forEach((res: any, i) => {
        const d = res?.data ?? res;
        if (!d) return;
        // A branch manager oversees the whole branch, not one section, so
        // they belong in every section's view under it regardless of
        // whatever sectionId (if any) their own record happens to carry.
        const inThisSection = d.sectionId === this.sectionId;
        const overseesBranch = d.employeeRole === EmployeeType.BranchManager;
        if (inThisSection || overseesBranch) matched.push({ ...items[i], ...d });
      });
      finish(matched);
    });
  }

  readonly digitsOnlyInput = digitsOnlyInput;

  onAddPhoneInput(event: Event): void { this.addForm.get('phoneNumber')!.setValue(digitsOnlyInput(event)); }
  onEmContactPhoneInput(event: Event): void { this.emContactForm.get('phone')!.setValue(digitsOnlyInput(event)); }

  onAddFirstNameInput(event: Event): void { this.addForm.get('firstName')!.setValue(lettersOnlyInput(event)); }
  onAddLastNameInput(event: Event): void { this.addForm.get('lastName')!.setValue(lettersOnlyInput(event)); }
  onEditFirstNameInput(event: Event): void { this.editForm.get('firstName')!.setValue(lettersOnlyInput(event)); }
  onEditLastNameInput(event: Event): void { this.editForm.get('lastName')!.setValue(lettersOnlyInput(event)); }
  onEmContactNameInput(event: Event): void { this.emContactForm.get('name')!.setValue(lettersOnlyInput(event)); }

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
      employeeRole: EmployeeType.Employee,
      gender:       GenderType.Male,
      contractType: ContractType.FullTime,
      currencyId:   this.myCurrencies()[0]?.id ?? null,
      hireDate:     this.companyTime.todayIso(),
    });
    this.addSections.set([]);
    this.modalError.set(null);
    if (this.branchId) {
      this.addForm.patchValue({ branchId: this.branchId });
      this.loadSectionsInto(this.branchId, this.addSections);
    }
    if (this.sectionId) {
      this.addForm.patchValue({ sectionId: this.sectionId });
    }
    this.showAddModal.set(true);
  }

  submitAdd(): void {
    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);

    const v = this.addForm.value;
    this.employeeService.create({
      phoneNumber:    v.phoneNumber!,
      firstName:      v.firstName!,
      lastName:       v.lastName!,
      email:          v.email    || undefined,
      employeeRole:   v.employeeRole!,
      employeeNumber: v.employeeNumber!,
      jobTitle:       v.jobTitle!,
      birthDate:      v.birthDate!,
      gender:         v.gender!,
      nationality:    v.nationality || undefined,
      branchId:       v.branchId  ?? undefined,
      sectionId:      v.sectionId ?? undefined,
      hireDate:       v.hireDate!,
      contractType:   v.contractType!,
      baseSalary:     v.baseSalary!,
      currencyId:     v.currencyId!,
      internalNotes:  v.internalNotes || undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAddModal.set(false);
        this.flash('Employee added successfully!');
        this.filter.patch({ pageNumber: 1 });
        this.loadEmployees();
      },
      // No local error banner — the global interceptor already shows this
      // failure as a snackbar.
      error: () => { this.submitting.set(false); },
    });
  }

  // ── Branch → Sections cascading for forms ────────────────────────────────
  onAddBranchChange(branchId: number | null): void {
    this.addSections.set([]);
    this.addForm.get('sectionId')!.setValue(null);
    if (branchId) this.loadSectionsInto(branchId, this.addSections);
  }

  onEditBranchChange(branchId: number | null): void {
    this.editSections.set([]);
    this.editForm.get('sectionId')!.setValue(null);
    if (branchId) this.loadSectionsInto(branchId, this.editSections);
  }


  private loadSectionsInto(branchId: number, target: WritableSignal<Section[]>): void {
    this.sectionService.getAll({ branchId, pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res;
        target.set(Array.isArray(raw) ? raw : (raw?.items ?? []));
      },
      error: () => {},
    });
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  openEdit(emp: Employee, event: Event): void {
    event.stopPropagation();
    this.selectedEmployee.set(emp);
    this.editForm.reset();
    this.editSections.set([]);
    this.modalError.set(null);
    this.editLoading.set(true);
    this.showEditModal.set(true);

    this.employeeService.getById(emp.id).subscribe({
      next: (res: any) => {
        this.editLoading.set(false);
        const e = res?.data ?? res;
        this.editForm.patchValue({
          firstName:      e.firstName,
          lastName:       e.lastName,
          email:          e.email          ?? '',
          employeeRole:   e.employeeRole   ?? EmployeeType.Employee,
          employeeNumber: e.employeeNumber ?? '',
          jobTitle:       e.jobTitle       ?? '',
          birthDate:      e.birthDate      ? e.birthDate.substring(0, 10) : '',
          gender:         e.gender         ?? GenderType.Male,
          nationality:    e.nationality    ?? '',
          branchId:       e.branchId       ?? null,
          sectionId:      e.sectionId      ?? null,
          hireDate:       e.hireDate       ? e.hireDate.substring(0, 10) : '',
          contractType:   e.contractType   ?? ContractType.FullTime,
          baseSalary:     e.baseSalary     ?? null,
          currencyId:     e.currencyId     ?? this.myCurrencies()[0]?.id ?? null,
          internalNotes:  e.internalNotes  ?? '',
        });
        this.originalEditCurrencyId.set(e.currencyId ?? null);
        if (e.branchId) this.loadSectionsInto(e.branchId, this.editSections);
      },
      error: () => { this.editLoading.set(false); },
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
      firstName:      v.firstName      || undefined,
      lastName:       v.lastName       || undefined,
      email:          v.email          || undefined,
      employeeRole:   v.employeeRole   ?? EmployeeType.Employee,
      employeeNumber: v.employeeNumber || undefined,
      jobTitle:       v.jobTitle       || undefined,
      birthDate:      v.birthDate      || undefined,
      gender:         v.gender         ?? GenderType.Male,
      nationality:    v.nationality    || undefined,
      branchId:       v.branchId       ?? undefined,
      sectionId:      v.sectionId      ?? undefined,
      hireDate:       v.hireDate       || undefined,
      contractType:   v.contractType   ?? ContractType.FullTime,
      baseSalary:     v.baseSalary     ?? undefined,
      currencyId:     v.currencyId     ?? undefined,
      internalNotes:  v.internalNotes  || undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showEditModal.set(false);
        this.flash('Employee updated.');
        this.loadEmployees();
      },
      // No local error banner — the global interceptor already shows this
      // failure as a snackbar.
      error: () => { this.submitting.set(false); },
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
    this.viewEmployeeTodayShift.set(null);
    this.viewBranchName.set(null);
    this.viewSectionName.set(null);
    this.emContacts.set([]);
    this.emContactsView.set('list');
    this.emContactsError.set(null);
    this.employeeService.getById(emp.id).subscribe({
      next: (res: any) => {
        this.viewLoading.set(false);
        const d = (res?.data ?? res) as Employee;
        this.viewEmployee.set(d);
        if (d.branchId) {
          const branch = this.formBranches().find(b => b.id === d.branchId);
          this.viewBranchName.set(branch?.name ?? null);
        }
        if (d.sectionId) {
          this.sectionService.getById(d.sectionId).subscribe({
            next: (sres: any) => this.viewSectionName.set((sres?.data ?? sres)?.name ?? null),
            error: () => this.viewSectionName.set(null),
          });
        }
      },
      error: () => this.viewLoading.set(false),
    });
    this.loadEmContacts(emp.id);

    // Work hours aren't on the employee record itself — they live per-weekday
    // on whatever shift system the employee is assigned to.
    const todayDow = this.companyTime.toCompanyTime().getUTCDay();
    this.shiftSystemService.getEmployeeShiftSystem(emp.id).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        const days: { dayOfWeek: number; startTime: string; endTime: string }[] = data?.days ?? [];
        const today = days.find(d => d.dayOfWeek === todayDow);
        this.viewEmployeeTodayShift.set(today ? { startTime: today.startTime, endTime: today.endTime } : null);
      },
      error: () => { /* no shift assigned — leave dashes */ },
    });
  }

  // ── Emergency Contacts CRUD ───────────────────────────────────────────────
  loadEmContacts(empId: number): void {
    this.emContactsLoading.set(true);
    this.emContactsError.set(null);
    this.employeeService.getEmergencyContacts(empId).subscribe({
      next: (res: any) => {
        this.emContactsLoading.set(false);
        const raw = res?.data ?? res;
        this.emContacts.set(Array.isArray(raw) ? raw : (raw?.items ?? []));
      },
      error: err => {
        this.emContactsLoading.set(false);
        if (err?.status === 404) {
          this.emContacts.set([]);
        } else {
          this.emContactsError.set(this.apiErr(err, 'Failed to load emergency contacts.'));
        }
      },
    });
  }

  openEmContactAdd(): void {
    this.emContactForm.reset({ relation: RelationType.Father, priority: this.emContacts().length + 1 });
    this.emContactsModalError.set(null);
    this.emContactsView.set('add');
  }

  submitEmContactAdd(): void {
    if (this.emContactForm.invalid) { this.emContactForm.markAllAsTouched(); return; }
    const empId = this.viewEmployee()?.id;
    if (!empId) return;
    this.emContactsSubmitting.set(true);
    this.emContactsModalError.set(null);
    const v = this.emContactForm.value;
    const payload: CreateEmergencyContactRequest = {
      name:     v.name!,
      phone:    v.phone!,
      relation: v.relation!,
      priority: v.priority!,
    };
    this.employeeService.createEmergencyContact(empId, payload).subscribe({
      next: () => {
        this.emContactsSubmitting.set(false);
        this.emContactsView.set('list');
        this.loadEmContacts(empId);
      },
      error: () => { this.emContactsSubmitting.set(false); },
    });
  }

  openEmContactEdit(contact: EmergencyContact): void {
    this.emEditContact.set(contact);
    this.emContactForm.patchValue({
      name:     contact.name,
      phone:    contact.phone,
      relation: contact.relation,
      priority: contact.priority,
    });
    this.emContactsModalError.set(null);
    this.emContactsView.set('edit');
  }

  submitEmContactEdit(): void {
    if (this.emContactForm.invalid) { this.emContactForm.markAllAsTouched(); return; }
    const empId     = this.viewEmployee()?.id;
    const contactId = this.emEditContact()?.id;
    if (!empId || !contactId) return;
    this.emContactsSubmitting.set(true);
    this.emContactsModalError.set(null);
    const v = this.emContactForm.value;
    this.employeeService.updateEmergencyContact(empId, contactId, {
      name:     v.name!,
      phone:    v.phone!,
      relation: v.relation!,
      priority: v.priority!,
    }).subscribe({
      next: () => {
        this.emContactsSubmitting.set(false);
        this.emContactsView.set('list');
        this.loadEmContacts(empId);
      },
      error: () => { this.emContactsSubmitting.set(false); },
    });
  }

  openEmContactDelete(id: number): void {
    this.emDeleteTargetId.set(id);
    this.showEmDeleteModal.set(true);
  }

  executeEmContactDelete(): void {
    const empId     = this.viewEmployee()?.id;
    const contactId = this.emDeleteTargetId();
    if (!empId || contactId === null) return;
    this.emContactsSubmitting.set(true);
    this.employeeService.deleteEmergencyContact(empId, contactId).subscribe({
      next: () => {
        this.emContactsSubmitting.set(false);
        this.showEmDeleteModal.set(false);
        this.emContacts.update(list => list.filter(c => c.id !== contactId));
      },
      error: () => {
        this.emContactsSubmitting.set(false);
        this.showEmDeleteModal.set(false);
      },
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
        if (err?.status === 404) this.employeeShiftSystem.set(null);
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
      error: () => { this.shiftSubmitting.set(false); this.showAssignForm.set(false); },
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
      error: () => { this.shiftSubmitting.set(false); },
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
      error: () => { this.shiftSubmitting.set(false); },
    });
  }

  /** Absolute route to a per-employee sub-page (shift-logs, leaves, incentives-deductions),
   *  respecting whichever of /dashboard/manager or /dashboard/hr this list is rendered under. */
  employeeSubRoute(empId: number, sub: string): string[] {
    return [`${this.dashboardBase}/employees`, String(empId), sub];
  }

  dayLabel(dow: DayOfWeek): string {
    return this.lang.t(`manager.dayOfWeek.${dow}`);
  }

  currencySymbolFor(currencyId?: number | null): string {
    if (!currencyId) return '';
    return this.myCurrencies().find(c => c.id === currencyId)?.symbol ?? '';
  }

  formatSalary(e: Employee): string {
    if (e.baseSalary == null) return '—';
    return formatCurrencyAmount(e.baseSalary, e.currencySymbol || this.currencySymbolFor(e.currencyId));
  }

  isImageAttachment(url: string): boolean {
    return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url);
  }

  openImagePreview(url: string, event: Event): void {
    event.stopPropagation();
    this.previewImageUrl.set(url);
  }

  closeImagePreview(): void {
    this.previewImageUrl.set(null);
  }

  // ── Attachments modal open ─────────────────────────────────────────────────
  openAttach(emp: Employee, event: Event): void {
    event.stopPropagation();
    this.editEmployeeDetail.set(emp);
    this.attachmentError.set(null);
    this.attachedTypes.set(new Set(this.attachCache.get(emp.id) ?? []));
    this.attachmentUrls.set(new Map());
    this.showAttachModal.set(true);
    this.attachModalLoading.set(true);
    this.employeeService.getAttachments(emp.id).subscribe({
      next: (list: any) => {
        const items: any[] = Array.isArray(list) ? list : (list?.data ?? []);
        const types = new Set<AttachmentType>();
        const urls = new Map<AttachmentType, string>();
        for (const a of items) {
          types.add(a.type);
          if (a.url) urls.set(a.type, a.url);
        }
        this.attachedTypes.set(types);
        this.attachmentUrls.set(urls);
        this.attachCache.set(emp.id, types);
        this.attachModalLoading.set(false);
      },
      error: () => { this.attachModalLoading.set(false); },
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
        this.refreshEmployeeStatus(empId);
      },
      error: () => { this.historySubmitting.set(false); },
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
        this.refreshEmployeeStatus(empId);
      },
      error: () => { this.historySubmitting.set(false); },
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
        this.refreshEmployeeStatus(empId);
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
        this.attachedTypes.update(s => new Set([...s, type]));
        this.attachmentUrls.update(m => new Map(m).set(type, url));
        if (!this.attachCache.has(empId)) this.attachCache.set(empId, new Set());
        this.attachCache.get(empId)!.add(type);
      },
      error: () => { this.uploadingType.set(null); },
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
        this.attachedTypes.update(s => { const n = new Set(s); n.delete(type); return n; });
        this.attachmentUrls.update(m => { const n = new Map(m); n.delete(type); return n; });
        this.attachCache.get(empId)?.delete(type);
      },
      error: () => { this.deletingAttachType.set(null); },
    });
  }

  private refreshEmployeeStatus(empId: number): void {
    this.employeeService.getById(empId).subscribe({
      next: (res: any) => {
        const updated = res?.data ?? res as Employee;
        this.employees.update(list =>
          list.map(e => e.id === empId ? { ...e, status: updated.status } : e)
        );
      },
      error: () => {},
    });
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
    return this.companyTime.formatDate(dateStr);
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
