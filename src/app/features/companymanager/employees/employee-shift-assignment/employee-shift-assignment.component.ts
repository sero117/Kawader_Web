import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { ShiftSystemService } from '../../../../core/services/shift-system.service';
import { EmployeeShiftSystem, ShiftSystem, DayOfWeek } from '../../../../core/models/shift.models';

@Component({
  selector: 'app-employee-shift-assignment',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './employee-shift-assignment.component.html',
})
export class EmployeeShiftAssignmentComponent implements OnInit {
  private readonly shiftSystemService = inject(ShiftSystemService);
  private readonly lang               = inject(LanguageService);
  private readonly route              = inject(ActivatedRoute);

  employeeId = 0;

  loading             = signal(true);
  employeeShiftSystem = signal<EmployeeShiftSystem | null>(null);
  showAssignForm      = signal(false);
  submitting          = signal(false);
  availableSystems    = signal<ShiftSystem[]>([]);
  selectedSystemId    = signal<number | null>(null);
  successMsg          = signal<string | null>(null);

  ngOnInit(): void {
    this.employeeId = Number(this.route.parent!.snapshot.paramMap.get('employeeId'));
    this.load();
  }

  private load(): void {
    this.showAssignForm.set(false);
    this.selectedSystemId.set(null);
    this.loading.set(true);

    this.shiftSystemService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res: any) => {
        const raw  = res?.data ?? res;
        const list: ShiftSystem[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        this.availableSystems.set(list);
      },
      error: () => {},
    });

    this.shiftSystemService.getEmployeeShiftSystem(this.employeeId).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        this.employeeShiftSystem.set(res?.data ?? res);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 404) this.employeeShiftSystem.set(null);
      },
    });
  }

  openAssignForm(): void {
    this.selectedSystemId.set(null);
    this.showAssignForm.set(true);
    this.submitting.set(true);
    this.shiftSystemService.unassignEmployee(this.employeeId).subscribe({
      next: () => {
        this.submitting.set(false);
        this.employeeShiftSystem.set(null);
      },
      error: () => { this.submitting.set(false); this.showAssignForm.set(false); },
    });
  }

  submitAssign(): void {
    const systemId = this.selectedSystemId();
    if (!systemId) return;
    this.submitting.set(true);
    this.shiftSystemService.assignEmployee(this.employeeId, {
      shiftSystemId:  systemId,
      idempotencyKey: crypto.randomUUID(),
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAssignForm.set(false);
        this.selectedSystemId.set(null);
        this.loading.set(true);
        this.shiftSystemService.getEmployeeShiftSystem(this.employeeId).subscribe({
          next: (res: any) => { this.loading.set(false); this.employeeShiftSystem.set(res?.data ?? res); },
          error: ()         => { this.loading.set(false); },
        });
        this.flash('Shift system assigned.');
      },
      error: () => { this.submitting.set(false); },
    });
  }

  executeUnassign(): void {
    this.submitting.set(true);
    this.shiftSystemService.unassignEmployee(this.employeeId).subscribe({
      next: () => {
        this.submitting.set(false);
        this.employeeShiftSystem.set(null);
        this.flash('Shift assignment removed.');
      },
      error: () => { this.submitting.set(false); },
    });
  }

  dayLabel(dow: DayOfWeek): string {
    return this.lang.t(`manager.dayOfWeek.${dow}`);
  }

  private flash(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3500);
  }
}
