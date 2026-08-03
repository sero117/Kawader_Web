import { Component, signal, inject, OnInit, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { EmployeeService } from '../../../../core/services/employee.service';
import { BranchService } from '../../../../core/services/branch.service';
import { SectionService } from '../../../../core/services/section.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { Branch } from '../../../../core/models/branch.models';
import { Section } from '../../../../core/models/section.models';
import { Currency } from '../../../../core/models/currency.models';
import { Employee, EmployeeType, GenderType, ContractType } from '../../../../core/models/employee.models';
import { lettersOnlyInput } from '../../../../core/utils/letters-only-input';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './employee-detail.component.html',
})
export class EmployeeDetailComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly branchService   = inject(BranchService);
  private readonly sectionService  = inject(SectionService);
  private readonly currencyService = inject(CurrencyService);
  private readonly fb              = inject(FormBuilder);
  private readonly lang            = inject(LanguageService);
  private readonly route           = inject(ActivatedRoute);
  private readonly router          = inject(Router);

  employeeId    = 0;
  dashboardBase = '/dashboard/manager';
  backUrl       = signal('/dashboard/manager/employees');

  employee = signal<Employee | null>(null);
  loading  = signal(true);

  successMsg = signal<string | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);

  showEditModal   = signal(false);
  editLoading     = signal(false);
  showDeleteModal = signal(false);

  formBranches = signal<Branch[]>([]);
  editSections = signal<Section[]>([]);
  myCurrencies = signal<Currency[]>([]);
  originalEditCurrencyId = signal<number | null>(null);

  readonly EmployeeType = EmployeeType;
  readonly GenderType    = GenderType;
  readonly ContractType  = ContractType;

  readonly tabs = [
    { path: 'overview',               labelKey: 'manager.employeeDetail.tabOverview' },
    { path: 'shift-assignment',       labelKey: 'manager.employeeDetail.tabShiftAssignment' },
    { path: 'shift-logs',             labelKey: 'manager.employeeDetail.tabShiftLogs' },
    { path: 'leaves',                 labelKey: 'manager.employeeDetail.tabLeaves' },
    { path: 'incentives-deductions',  labelKey: 'manager.employeeDetail.tabIncentivesDeductions' },
    { path: 'attachments',            labelKey: 'manager.employeeDetail.tabAttachments' },
    { path: 'status-history',         labelKey: 'manager.employeeDetail.tabStatusHistory' },
  ];

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

  ngOnInit(): void {
    this.employeeId = Number(this.route.snapshot.paramMap.get('employeeId'));
    const base = this.router.url.startsWith('/dashboard/hr') ? '/dashboard/hr' : '/dashboard/manager';
    this.dashboardBase = base;
    this.backUrl.set(`${base}/employees`);

    this.loadEmployee();
    this.branchService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res;
        this.formBranches.set(Array.isArray(raw) ? raw : (raw?.items ?? []));
      },
      error: () => {},
    });
    // Silent — /currencies/me returns an empty array (not an error) when the
    // Admin hasn't granted this company any currency yet.
    this.currencyService.getMe(true).subscribe({
      next: list => this.myCurrencies.set(list ?? []),
      error: () => this.myCurrencies.set([]),
    });
  }

  loadEmployee(): void {
    this.loading.set(true);
    this.employeeService.getById(this.employeeId).subscribe({
      next: (res: any) => { this.employee.set(res?.data ?? res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  readonly lettersOnlyInput = lettersOnlyInput;
  onEditFirstNameInput(event: Event): void { this.editForm.get('firstName')!.setValue(lettersOnlyInput(event)); }
  onEditLastNameInput(event: Event): void { this.editForm.get('lastName')!.setValue(lettersOnlyInput(event)); }

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

  currencySymbolFor(currencyId?: number | null): string {
    if (!currencyId) return '';
    return this.myCurrencies().find(c => c.id === currencyId)?.symbol ?? '';
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  openEdit(): void {
    const emp = this.employee();
    if (!emp) return;
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
    const id = this.employee()?.id;
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
        this.loadEmployee();
      },
      // No local error banner — the global interceptor already shows this
      // failure as a snackbar.
      error: () => { this.submitting.set(false); },
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  confirmDelete(): void { this.showDeleteModal.set(true); }

  executeDelete(): void {
    const id = this.employee()?.id;
    if (!id) return;
    this.submitting.set(true);
    this.employeeService.delete(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeleteModal.set(false);
        this.router.navigateByUrl(this.backUrl());
      },
      error: () => { this.submitting.set(false); this.showDeleteModal.set(false); },
    });
  }

  employeeTypeLabel(type: EmployeeType): string {
    return this.lang.t(`manager.employeeTypes.${type}`);
  }

  employeeStatusLabel(status: number | undefined): string {
    if (status === undefined || status === null) return '—';
    return this.lang.t(`manager.employeeStatus.${status}`);
  }

  private flash(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3500);
  }
}
