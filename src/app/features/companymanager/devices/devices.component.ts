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

  // ── Device Create/Edit modal ───────────────────────────────────────────────
  showDeviceModal = signal(false);
  editTarget      = signal<Device | null>(null);
  submitting      = signal(false);
  modalError      = signal<string | null>(null);

  deviceForm = this.fb.group({
    serialNumber: ['', Validators.required],
    name:         ['', Validators.required],
    protocol:     [0,  Validators.required],
  });

  get isEdit(): boolean { return this.editTarget() !== null; }

  // ── Delete device modal ───────────────────────────────────────────────────
  showDeleteModal  = signal(false);
  deleteTargetId   = signal<number | null>(null);

  // ── Regenerate secret modal ───────────────────────────────────────────────
  showRegenModal  = signal(false);
  regenTargetId   = signal<number | null>(null);
  regenSubmitting = signal(false);
  regenSecret     = signal<string | null>(null);
  regenCopied     = signal(false);

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
  showAddEmpModal = signal(false);
  empSubmitting   = signal(false);
  empModalError   = signal<string | null>(null);

  activeEmployees  = signal<ActiveEmployee[]>([]);
  empSearchQuery   = signal('');
  showEmpDropdown  = signal(false);
  selectedEmployee = signal<ActiveEmployee | null>(null);
  empNumber        = signal('');

  filteredEmployees = computed(() => {
    const q = this.empSearchQuery().toLowerCase();
    return this.activeEmployees().filter(e =>
      e.fullName.toLowerCase().includes(q) || e.phoneNumber.includes(q),
    );
  });

  // ── Delete employee modal ─────────────────────────────────────────────────
  showDeleteEmpModal  = signal(false);
  deleteEmpTargetId   = signal<number | null>(null);
  empDelSubmitting    = signal(false);

  ngOnInit(): void { this.loadDevices(); }

  // ── Device CRUD ───────────────────────────────────────────────────────────
  loadDevices(): void {
    this.loading.set(true);
    this.listError.set(null);
    this.deviceService.getAll(this.pageNumber(), this.pageSize).subscribe({
      next: res => {
        const items = (res as any)?.data?.items ?? (res as any)?.items ?? [];
        this.devices.set(items);
        this.hasMore.set((res as any)?.data?.hasNextPage ?? (res as any)?.hasNextPage ?? false);
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
    this.deviceForm.reset({ serialNumber: '', name: '', protocol: 0 });
    this.modalError.set(null);
    this.showDeviceModal.set(true);
  }

  openEdit(device: Device, event: Event): void {
    event.stopPropagation();
    this.editTarget.set(device);
    this.deviceForm.patchValue({ name: device.name });
    this.deviceForm.get('serialNumber')?.disable();
    this.deviceForm.get('protocol')?.disable();
    this.modalError.set(null);
    this.showDeviceModal.set(true);
  }

  closeDeviceModal(): void {
    this.showDeviceModal.set(false);
    this.deviceForm.get('serialNumber')?.enable();
    this.deviceForm.get('protocol')?.enable();
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
        error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'common.saveFailed')); },
      });
    } else {
      this.deviceService.create({
        serialNumber:   v.serialNumber!,
        name:           v.name!,
        protocol:       Number(v.protocol),
        idempotencyKey: crypto.randomUUID(),
      }).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeDeviceModal();
          this.loadDevices();
        },
        error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'common.saveFailed')); },
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

  // ── Regenerate secret ─────────────────────────────────────────────────────
  openRegen(id: number, event: Event): void {
    event.stopPropagation();
    this.regenTargetId.set(id);
    this.regenSecret.set(null);
    this.regenCopied.set(false);
    this.showRegenModal.set(true);
  }

  executeRegen(): void {
    const id = this.regenTargetId();
    if (id === null) return;
    this.regenSubmitting.set(true);
    this.deviceService.regenerateSecret(id).subscribe({
      next: (res: any) => {
        this.regenSubmitting.set(false);
        const secret = res?.data?.secret ?? res?.secret ?? res?.data ?? (typeof res === 'string' ? res : null);
        this.regenSecret.set(secret);
      },
      error: () => { this.regenSubmitting.set(false); this.showRegenModal.set(false); },
    });
  }

  copySecret(): void {
    const s = this.regenSecret();
    if (!s) return;
    navigator.clipboard.writeText(s).then(() => {
      this.regenCopied.set(true);
      setTimeout(() => this.regenCopied.set(false), 2000);
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
      next: res => {
        const items = (res as any)?.data?.items ?? (res as any)?.items ?? [];
        this.deviceEmployees.set(items);
        this.empHasMore.set((res as any)?.data?.hasNextPage ?? (res as any)?.hasNextPage ?? false);
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
    this.empNumber.set('');
    this.empModalError.set(null);
    this.showEmpDropdown.set(false);
    this.loadActiveEmployees();
    this.showAddEmpModal.set(true);
  }

  loadActiveEmployees(): void {
    this.employeeService.getActive().subscribe({
      next: (list: any) => {
        const items = Array.isArray(list) ? list : ((list as any)?.data ?? []);
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
    const num = this.empNumber().trim();
    if (!emp || !num) {
      this.empModalError.set('يرجى اختيار موظف وإدخال رقم التسجيل');
      return;
    }
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
      error: err => { this.empSubmitting.set(false); this.empModalError.set(this.apiErr(err, 'common.saveFailed')); },
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
  apiErr(err: any, fallback: string): string {
    if (err?.status === 0) return 'Cannot connect to server.';
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
