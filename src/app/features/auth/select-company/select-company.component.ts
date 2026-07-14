import { Component, signal, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { EmployeeCompany } from '../../../core/models/employee.models';
import { EmployeeType } from '../../../core/models/auth.models';

@Component({
  selector: 'app-select-company',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './select-company.component.html',
})
export class SelectCompanyComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly authService     = inject(AuthService);
  private readonly router          = inject(Router);

  companies   = signal<EmployeeCompany[]>([]);
  loading     = signal(true);
  errorMsg    = signal<string | null>(null);
  selectingId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.employeeService.getMyCompanies().subscribe({
      next: (res: any) => {
        const raw  = res?.data ?? res;
        const list: EmployeeCompany[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        this.companies.set(list);
        this.loading.set(false);

        // Nothing to choose between — skip straight to the dashboard.
        if (list.length === 1) {
          this.choose(list[0]);
        }
      },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(this.apiErr(err));
      },
    });
  }

  choose(company: EmployeeCompany): void {
    this.selectingId.set(company.companyId);
    this.authService.setSelectedTenantId(company.tenantId);

    // Probe for HR access: if the Employees list is reachable → this is an HR user.
    // X-Silent on the probe means a 403 won't trigger the global logout handler.
    this.employeeService.checkHrAccess().subscribe(isHr => {
      if (isHr) {
        this.authService.saveEmployeeType(EmployeeType.HumanResourceManager);
      }
      const role = this.authService.getStoredRole();
      this.router.navigate([this.authService.getHomeRoute(role ?? undefined)]);
    });
  }

  signOut(): void {
    this.authService.clearTokens();
    this.router.navigate(['/auth/login']);
  }

  private apiErr(err: any): string {
    if (err?.status === 0) return 'Cannot connect to server.';
    const body = err?.error;
    if (typeof body === 'string' && body.trim()) return body.trim();
    for (const key of ['message', 'title', 'detail']) {
      const v = body?.[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return 'Failed to load your companies.';
  }
}
