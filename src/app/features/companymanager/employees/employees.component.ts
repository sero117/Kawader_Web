import { Component, signal, inject, OnInit, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { EmployeeService } from '../../../core/services/employee.service';
import { BranchService } from '../../../core/services/branch.service';
import { SectionService } from '../../../core/services/section.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { Branch } from '../../../core/models/branch.models';
import { Section } from '../../../core/models/section.models';
import { Currency } from '../../../core/models/currency.models';
import {
  Employee, EmployeeType, EmployeeStatus,
  GenderType, ContractType,
  GetEmployeesParams,
} from '../../../core/models/employee.models';
import { digitsOnlyInput } from '../../../core/utils/phone-input';
import { lettersOnlyInput } from '../../../core/utils/letters-only-input';
import { CompanyTimeService } from '../../../core/services/company-time.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './employees.component.html',
})
export class EmployeesComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly branchService   = inject(BranchService);
  private readonly sectionService  = inject(SectionService);
  private readonly currencyService = inject(CurrencyService);
  private readonly fb              = inject(FormBuilder);
  private readonly lang            = inject(LanguageService);
  private readonly route           = inject(ActivatedRoute);
  private readonly router          = inject(Router);
  private readonly companyTime     = inject(CompanyTimeService);

  branchId    = 0;
  sectionId   = 0;
  dashboardBase = '/dashboard/manager';
  sectionName  = signal<string>('');
  backUrl      = signal<string>('/dashboard/manager/branches');
  formBranches = signal<Branch[]>([]);
  addSections  = signal<Section[]>([]);
  myCurrencies = signal<Currency[]>([]);
  currencyLoadError = signal<string | null>(null);

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

  // ── Add modal ──────────────────────────────────────────────────────────────
  showAddModal = signal(false);

  private readonly phonePattern = /^09\d{8}$/;

  readonly EmployeeType   = EmployeeType;
  readonly EmployeeStatus = EmployeeStatus;
  readonly GenderType     = GenderType;
  readonly ContractType   = ContractType;

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
      // A failed *request* (e.g. 403) is not the same situation as the request
      // succeeding with an empty list — the "ask your admin to grant a
      // currency" message is actively wrong here, since a currency may well
      // already be granted and the call itself just couldn't go through.
      error: (err: any) => {
        this.myCurrencies.set([]);
        this.currencyLoadError.set(this.apiErr(err, this.lang.t('errors.currencyCheckFailed')));
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
  onAddFirstNameInput(event: Event): void { this.addForm.get('firstName')!.setValue(lettersOnlyInput(event)); }
  onAddLastNameInput(event: Event): void { this.addForm.get('lastName')!.setValue(lettersOnlyInput(event)); }

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

  // ── Branch → Sections cascading for the add form ─────────────────────────
  onAddBranchChange(branchId: number | null): void {
    this.addSections.set([]);
    this.addForm.get('sectionId')!.setValue(null);
    if (branchId) this.loadSectionsInto(branchId, this.addSections);
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

  // ── Row navigation ─────────────────────────────────────────────────────────
  openDetail(emp: Employee): void {
    this.router.navigate([`${this.dashboardBase}/employees`, emp.id]);
  }

  currencySymbolFor(currencyId?: number | null): string {
    if (!currencyId) return '';
    return this.myCurrencies().find(c => c.id === currencyId)?.symbol ?? '';
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  employeeTypeLabel(type: EmployeeType): string {
    return this.lang.t(`manager.employeeTypes.${type}`);
  }

  employeeStatusLabel(status: EmployeeStatus | undefined): string {
    if (status === undefined || status === null) return '—';
    return this.lang.t(`manager.employeeStatus.${status}`);
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
