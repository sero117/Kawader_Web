import { Component, signal, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { EmployeeService } from '../../../../core/services/employee.service';
import { BranchService } from '../../../../core/services/branch.service';
import { SectionService } from '../../../../core/services/section.service';
import { ShiftSystemService } from '../../../../core/services/shift-system.service';
import { CompanyTimeService } from '../../../../core/services/company-time.service';
import { Branch } from '../../../../core/models/branch.models';
import {
  Employee, ContractType, RelationType,
  EmergencyContact, CreateEmergencyContactRequest,
} from '../../../../core/models/employee.models';
import { formatCurrencyAmount } from '../../../../core/utils/currency-format';
import { digitsOnlyInput } from '../../../../core/utils/phone-input';
import { lettersOnlyInput } from '../../../../core/utils/letters-only-input';

@Component({
  selector: 'app-employee-overview',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './employee-overview.component.html',
})
export class EmployeeOverviewComponent implements OnInit {
  private readonly employeeService    = inject(EmployeeService);
  private readonly branchService      = inject(BranchService);
  private readonly sectionService     = inject(SectionService);
  private readonly shiftSystemService = inject(ShiftSystemService);
  private readonly companyTime        = inject(CompanyTimeService);
  private readonly fb                 = inject(FormBuilder);
  private readonly lang               = inject(LanguageService);
  private readonly route              = inject(ActivatedRoute);
  private readonly destroyRef         = inject(DestroyRef);

  employeeId = 0;

  employee = signal<Employee | null>(null);
  loading  = signal(true);
  employeeTodayShift = signal<{ startTime: string; endTime: string } | null>(null);
  branchName  = signal<string | null>(null);
  sectionName = signal<string | null>(null);

  // ── Emergency Contacts ─────────────────────────────────────────────────────
  emContacts           = signal<EmergencyContact[]>([]);
  emContactsLoading    = signal(false);
  emContactsError      = signal<string | null>(null);
  emContactsView       = signal<'list' | 'add' | 'edit'>('list');
  emContactsSubmitting = signal(false);
  emContactsModalError = signal<string | null>(null);
  emEditContact        = signal<EmergencyContact | null>(null);
  emDeleteTargetId     = signal<number | null>(null);
  showEmDeleteModal    = signal(false);

  readonly RelationType = RelationType;

  emContactForm = this.fb.group({
    name:     ['', [Validators.required, Validators.maxLength(100)]],
    phone:    ['', [Validators.required, Validators.pattern(/^09\d{8}$/)]],
    relation: [RelationType.Father, Validators.required],
    priority: [1, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.employeeId = Number(this.route.parent!.snapshot.paramMap.get('employeeId'));
    this.loadEmployee();
    this.loadEmContacts();

    // The edit modal lives in the employee-detail shell, one level up — its
    // own reload after a successful save only refreshes its own copy of the
    // employee (used for the header), not this tab's independently-loaded
    // one, so without this the overview kept showing pre-edit data until a
    // full page reload.
    this.employeeService.updated$
      .pipe(filter(id => id === this.employeeId), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadEmployee());
  }

  loadEmployee(): void {
    this.loading.set(true);
    this.employeeService.getById(this.employeeId).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        const d = (res?.data ?? res) as Employee;
        this.employee.set(d);
        if (d.branchId) {
          this.branchService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
            next: (bres: any) => {
              const raw = bres?.data ?? bres;
              const list: Branch[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
              this.branchName.set(list.find(b => b.id === d.branchId)?.name ?? null);
            },
            error: () => {},
          });
        }
        if (d.sectionId) {
          this.sectionService.getById(d.sectionId).subscribe({
            next: (sres: any) => this.sectionName.set((sres?.data ?? sres)?.name ?? null),
            error: () => this.sectionName.set(null),
          });
        }
      },
      error: () => this.loading.set(false),
    });

    // Work hours aren't on the employee record itself — they live per-weekday
    // on whatever shift system the employee is assigned to.
    const todayDow = this.companyTime.toCompanyTime().getUTCDay();
    this.shiftSystemService.getEmployeeShiftSystem(this.employeeId).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        const days: { dayOfWeek: number; startTime: string; endTime: string }[] = data?.days ?? [];
        const today = days.find(d => d.dayOfWeek === todayDow);
        this.employeeTodayShift.set(today ? { startTime: today.startTime, endTime: today.endTime } : null);
      },
      error: () => { /* no shift assigned — leave dashes */ },
    });
  }

  // ── Emergency Contacts CRUD ───────────────────────────────────────────────
  loadEmContacts(): void {
    this.emContactsLoading.set(true);
    this.emContactsError.set(null);
    this.employeeService.getEmergencyContacts(this.employeeId).subscribe({
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

  onEmContactPhoneInput(event: Event): void { this.emContactForm.get('phone')!.setValue(digitsOnlyInput(event)); }
  onEmContactNameInput(event: Event): void { this.emContactForm.get('name')!.setValue(lettersOnlyInput(event)); }

  openEmContactAdd(): void {
    this.emContactForm.reset({ relation: RelationType.Father, priority: this.emContacts().length + 1 });
    this.emContactsModalError.set(null);
    this.emContactsView.set('add');
  }

  submitEmContactAdd(): void {
    if (this.emContactForm.invalid) { this.emContactForm.markAllAsTouched(); return; }
    this.emContactsSubmitting.set(true);
    this.emContactsModalError.set(null);
    const v = this.emContactForm.value;
    const payload: CreateEmergencyContactRequest = {
      name:     v.name!,
      phone:    v.phone!,
      relation: v.relation!,
      priority: v.priority!,
    };
    this.employeeService.createEmergencyContact(this.employeeId, payload).subscribe({
      next: () => {
        this.emContactsSubmitting.set(false);
        this.emContactsView.set('list');
        this.loadEmContacts();
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
    const contactId = this.emEditContact()?.id;
    if (!contactId) return;
    this.emContactsSubmitting.set(true);
    this.emContactsModalError.set(null);
    const v = this.emContactForm.value;
    this.employeeService.updateEmergencyContact(this.employeeId, contactId, {
      name:     v.name!,
      phone:    v.phone!,
      relation: v.relation!,
      priority: v.priority!,
    }).subscribe({
      next: () => {
        this.emContactsSubmitting.set(false);
        this.emContactsView.set('list');
        this.loadEmContacts();
      },
      error: () => { this.emContactsSubmitting.set(false); },
    });
  }

  openEmContactDelete(id: number): void {
    this.emDeleteTargetId.set(id);
    this.showEmDeleteModal.set(true);
  }

  executeEmContactDelete(): void {
    const contactId = this.emDeleteTargetId();
    if (contactId === null) return;
    this.emContactsSubmitting.set(true);
    this.employeeService.deleteEmergencyContact(this.employeeId, contactId).subscribe({
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

  // ── Helpers ────────────────────────────────────────────────────────────────
  contractTypeLabel(type: ContractType): string {
    return this.lang.t(`manager.contractTypes.${type}`);
  }

  formatDate(dateStr?: string): string {
    return this.companyTime.formatDate(dateStr);
  }

  formatSalary(e: Employee): string {
    if (e.baseSalary == null) return '—';
    return formatCurrencyAmount(e.baseSalary, e.currencySymbol || '');
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
