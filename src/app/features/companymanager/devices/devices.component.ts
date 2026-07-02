import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { DeviceService } from '../../../core/services/device.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Device, DeviceEmployee } from '../../../core/models/device.models';
import { ActiveEmployee } from '../../../core/models/employee.models';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './devices.component.html',
})
export class DevicesComponent implements OnInit {
  private readonly deviceService   = inject(DeviceService);
  private readonly employeeService = inject(EmployeeService);
  private readonly fb              = inject(FormBuilder);

  // ── Devices list ──────────────────────────────────────────────────────────
  devices    = signal<Device[]>([]);
  loading    = signal(true);
  listError  = signal<string | null>(null);
  hasMore    = signal(false);
  pageNumber = signal(1);
  readonly pageSize = 10;

  // ── Device Create / Edit modal ────────────────────────────────────────────
  showDeviceModal = signal(false);
  editTarget      = signal<Device | null>(null);
  submitting      = signal(false);
  modalError      = signal<string | null>(null);

  deviceForm = this.fb.group({
    serialNumber: ['', [Validators.required, Validators.maxLength(100)]],
    name:         ['', [Validators.required, Validators.maxLength(200)]],
  });

  get isEdit(): boolean { return this.editTarget() !== null; }

  // ── New device secret (shown once after create or regenerate) ─────────────
  showSecretModal = signal(false);
  newSecret       = signal<string | null>(null);
  secretCopied    = signal(false);

  // ── Delete device modal ───────────────────────────────────────────────────
  showDeleteModal = signal(false);
  deleteTargetId  = signal<number | null>(null);

  // ── Regenerate secret modal ───────────────────────────────────────────────
  showRegenModal  = signal(false);
  regenTargetId   = signal<number | null>(null);
  regenSubmitting = signal(false);

  // ── Employees dialog ──────────────────────────────────────────────────────
  showEmpDialog   = signal(false);
  empDialogDevice = signal<Device | null>(null);
  deviceEmployees = signal<DeviceEmployee[]>([]);
  empLoading      = signal(false);
  empError        = signal<string | null>(null);
  empHasMore      = signal(false);
  empPage         = signal(1);
  readonly empPageSize = 10;

  // ── Add employee sub-modal ────────────────────────────────────────────────
  showAddEmpModal  = signal(false);
  empSubmitting    = signal(false);
  empModalError    = signal<string | null>(null);
  activeEmployees  = signal<ActiveEmployee[]>([]);
  empSearchQuery   = signal('');
  showEmpDropdown  = signal(false);
  selectedEmployee = signal<ActiveEmployee | null>(null);
  addEmpNumber     = signal('');

  filteredEmployees = computed(() => {
    const q = this.empSearchQuery().toLowerCase();
    return this.activeEmployees().filter(e =>
      e.fullName.toLowerCase().includes(q) || e.phoneNumber.includes(q),
    );
  });

  // ── Edit employee sub-modal ───────────────────────────────────────────────
  showEditEmpModal = signal(false);
  editEmpTarget    = signal<DeviceEmployee | null>(null);
  editEmpNumber    = signal('');
  editEmpError     = signal<string | null>(null);
  editEmpSubmit    = signal(false);

  // ── Delete employee modal ─────────────────────────────────────────────────
  showDeleteEmpModal = signal(false);
  deleteEmpTargetId  = signal<number | null>(null);
  empDelSubmitting   = signal(false);

  ngOnInit(): void { this.loadDevices(); }

  // ── Devices CRUD ──────────────────────────────────────────────────────────
  loadDevices(): void {
    this.loading.set(true);
    this.listError.set(null);
    this.deviceService.getAll(this.pageNumber(), this.pageSize).subscribe({
      next: (res: any) => {
        const items = res?.data?.items ?? res?.items ?? [];
        this.devices.set(items);
        this.hasMore.set(res?.data?.hasNextPage ?? res?.hasNextPage ?? false);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.listError.set(this.apiErr(err, 'manager.devices.loadError'));
      },
    });
  }

  prevPage(): void {
    if (this.pageNumber() <= 1) return;
    this.pageNumber.update(n => n - 1);
    this.loadDevices();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.pageNumber.update(n => n + 1);
    this.loadDevices();
  }

  openCreate(): void {
    this.editTarget.set(null);
    this.deviceForm.reset();
    this.deviceForm.get('serialNumber')?.enable();
    this.modalError.set(null);
    this.showDeviceModal.set(true);
  }

  openEdit(device: Device, event: Event): void {
    event.stopPropagation();
    this.editTarget.set(device);
    this.deviceForm.patchValue({ name: device.name });
    this.deviceForm.get('serialNumber')?.disable();
    this.modalError.set(null);
    this.showDeviceModal.set(true);
  }

  closeDeviceModal(): void {
    this.showDeviceModal.set(false);
    this.deviceForm.get('serialNumber')?.enable();
  }

  submitDevice(): void {
    if (this.deviceForm.invalid) { this.deviceForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);
    const v = this.deviceForm.getRawValue();

    if (this.isEdit) {
      this.deviceService.update(this.editTarget()!.id, { name: v.name! }).subscribe({
        next: () => {
          this.submitting.set(false);
          this.devices.update(list =>
            list.map(d => d.id === this.editTarget()!.id ? { ...d, name: v.name! } : d),
          );
          this.closeDeviceModal();
        },
        error: err => {
          this.submitting.set(false);
          this.modalError.set(this.apiErr(err, 'common.saveFailed', { 409: 'manager.devices.nameTaken', 412: 'manager.devices.noChange' }));
        },
      });
    } else {
      this.deviceService.create({
        serialNumber:   v.serialNumber!,
        name:           v.name!,
        protocol:       0,
        idempotencyKey: crypto.randomUUID(),
      }).subscribe({
        next: (res: any) => {
          this.submitting.set(false);
          this.closeDeviceModal();
          this.loadDevices();
          const secret = res?.data?.deviceSecret ?? res?.deviceSecret;
          if (secret) {
            this.newSecret.set(secret);
            this.secretCopied.set(false);
            this.showSecretModal.set(true);
          }
        },
        error: err => {
          this.submitting.set(false);
          this.modalError.set(this.apiErr(err, 'common.saveFailed', { 409: 'manager.devices.serialTaken' }));
        },
      });
    }
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
    this.deviceService.delete(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeleteModal.set(false);
        this.devices.update(list => list.filter(d => d.id !== id));
      },
      error: () => { this.submitting.set(false); this.showDeleteModal.set(false); },
    });
  }

  // ── Secret modal ──────────────────────────────────────────────────────────
  copySecret(): void {
    const s = this.newSecret();
    if (!s) return;
    navigator.clipboard.writeText(s).then(() => {
      this.secretCopied.set(true);
      setTimeout(() => this.secretCopied.set(false), 2000);
    });
  }

  // ── Regenerate secret ─────────────────────────────────────────────────────
  openRegen(id: number, event: Event): void {
    event.stopPropagation();
    this.regenTargetId.set(id);
    this.showRegenModal.set(true);
  }

  executeRegen(): void {
    const id = this.regenTargetId();
    if (id === null) return;
    this.regenSubmitting.set(true);
    this.deviceService.regenerateSecret(id).subscribe({
      next: (res: any) => {
        this.regenSubmitting.set(false);
        this.showRegenModal.set(false);
        const secret = res?.data?.deviceSecret ?? res?.deviceSecret;
        if (secret) {
          this.newSecret.set(secret);
          this.secretCopied.set(false);
          this.showSecretModal.set(true);
        }
      },
      error: () => { this.regenSubmitting.set(false); this.showRegenModal.set(false); },
    });
  }

  // ── Employees dialog ──────────────────────────────────────────────────────
  openEmpDialog(device: Device, event: Event): void {
    event.stopPropagation();
    this.empDialogDevice.set(device);
    this.empPage.set(1);
    this.showEmpDialog.set(true);
    this.loadDeviceEmployees();
  }

  loadDeviceEmployees(): void {
    const device = this.empDialogDevice();
    if (!device) return;
    this.empLoading.set(true);
    this.empError.set(null);
    this.deviceService.getEmployees(device.id, this.empPage(), this.empPageSize).subscribe({
      next: (res: any) => {
        const items = res?.data?.items ?? res?.items ?? [];
        this.deviceEmployees.set(items);
        this.empHasMore.set(res?.data?.hasNextPage ?? res?.hasNextPage ?? false);
        this.empLoading.set(false);
      },
      error: err => {
        this.empLoading.set(false);
        this.empError.set(this.apiErr(err, 'manager.devices.employees.loadError'));
      },
    });
  }

  empPrevPage(): void {
    if (this.empPage() <= 1) return;
    this.empPage.update(n => n - 1);
    this.loadDeviceEmployees();
  }

  empNextPage(): void {
    if (!this.empHasMore()) return;
    this.empPage.update(n => n + 1);
    this.loadDeviceEmployees();
  }

  // ── Add employee ──────────────────────────────────────────────────────────
  openAddEmp(): void {
    this.selectedEmployee.set(null);
    this.empSearchQuery.set('');
    this.addEmpNumber.set('');
    this.empModalError.set(null);
    this.showEmpDropdown.set(false);
    this.loadActiveEmployees();
    this.showAddEmpModal.set(true);
  }

  loadActiveEmployees(): void {
    this.employeeService.getActive().subscribe({
      next: (list: any) => {
        const items = Array.isArray(list) ? list : (list?.data ?? []);
        this.activeEmployees.set(items);
      },
      error: () => {},
    });
  }

  selectEmployee(emp: ActiveEmployee): void {
    this.selectedEmployee.set(emp);
    this.empSearchQuery.set(emp.fullName);
    this.showEmpDropdown.set(false);
  }

  onEmpSearchInput(value: string): void {
    this.empSearchQuery.set(value);
    if (!value) this.selectedEmployee.set(null);
    this.showEmpDropdown.set(true);
  }

  submitAddEmployee(): void {
    const emp = this.selectedEmployee();
    const num = this.addEmpNumber().trim();
    if (!emp || !num) { this.empModalError.set('يرجى اختيار موظف وإدخال رقم التسجيل'); return; }
    const device = this.empDialogDevice();
    if (!device) return;
    this.empSubmitting.set(true);
    this.empModalError.set(null);
    this.deviceService.addEmployee(device.id, { employeeId: emp.id, number: num }).subscribe({
      next: () => {
        this.empSubmitting.set(false);
        this.showAddEmpModal.set(false);
        this.loadDeviceEmployees();
      },
      error: err => {
        this.empSubmitting.set(false);
        this.empModalError.set(this.apiErr(err, 'common.saveFailed', {
          409: 'manager.devices.employees.conflict',
        }));
      },
    });
  }

  // ── Edit employee ─────────────────────────────────────────────────────────
  openEditEmp(emp: DeviceEmployee): void {
    this.editEmpTarget.set(emp);
    this.editEmpNumber.set(emp.number);
    this.editEmpError.set(null);
    this.showEditEmpModal.set(true);
  }

  submitEditEmployee(): void {
    const emp    = this.editEmpTarget();
    const device = this.empDialogDevice();
    const num    = this.editEmpNumber().trim();
    if (!emp || !device || !num) return;
    this.editEmpSubmit.set(true);
    this.editEmpError.set(null);
    this.deviceService.updateEmployee(device.id, emp.id, { number: num }).subscribe({
      next: () => {
        this.editEmpSubmit.set(false);
        this.showEditEmpModal.set(false);
        this.deviceEmployees.update(list =>
          list.map(e => e.id === emp.id ? { ...e, number: num } : e),
        );
      },
      error: err => {
        this.editEmpSubmit.set(false);
        this.editEmpError.set(this.apiErr(err, 'common.saveFailed', {
          409: 'manager.devices.employees.numberTaken',
          412: 'manager.devices.noChange',
        }));
      },
    });
  }

  // ── Delete employee ───────────────────────────────────────────────────────
  confirmDeleteEmp(employeeDeviceId: number): void {
    this.deleteEmpTargetId.set(employeeDeviceId);
    this.showDeleteEmpModal.set(true);
  }

  executeDeleteEmp(): void {
    const empDevId = this.deleteEmpTargetId();
    const device   = this.empDialogDevice();
    if (empDevId === null || !device) return;
    this.empDelSubmitting.set(true);
    this.deviceService.deleteEmployee(device.id, empDevId).subscribe({
      next: () => {
        this.empDelSubmitting.set(false);
        this.showDeleteEmpModal.set(false);
        this.deviceEmployees.update(list => list.filter(e => e.id !== empDevId));
      },
      error: () => { this.empDelSubmitting.set(false); this.showDeleteEmpModal.set(false); },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  empFullName(emp: DeviceEmployee): string {
    return `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || '—';
  }

  empInitial(emp: DeviceEmployee): string {
    return (emp.firstName ?? emp.lastName ?? '?').charAt(0).toUpperCase();
  }

  apiErr(err: any, fallback: string, statusMap: Record<number, string> = {}): string {
    if (err?.status === 0) return 'Cannot connect to server.';
    if (statusMap[err?.status]) return statusMap[err.status];
    const body = err?.error;
    if (!body) return fallback;
    if (typeof body === 'string' && body.trim()) return body.trim();
    for (const key of ['message', 'title', 'detail', 'error']) {
      const v = body[key];
      if (typeof v === 'string' && v.trim() && v.length < 400) return v.trim();
    }
    return fallback;
  }
}
