import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { EmployeeType } from '../../../core/models/auth.models';
import { EmployeeCompany } from '../../../core/models/employee.models';
import { ThemeSwitcherComponent } from '../../../core/components/theme-switcher/theme-switcher.component';
import { LanguageSwitcherComponent } from '../../../core/components/language-switcher/language-switcher.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-employee-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeSwitcherComponent, LanguageSwitcherComponent, TranslatePipe],
  templateUrl: './employee-layout.component.html',
})
export class EmployeeLayoutComponent implements OnInit {
  private readonly router          = inject(Router);
  private readonly authService     = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly employeeService = inject(EmployeeService);

  readonly EmployeeType = EmployeeType;

  collapsed    = signal(window.innerWidth < 640);
  displayName  = signal(this.authService.getDisplayName());
  employeeType = signal(this.authService.getEmployeeTypeFromToken());

  // ── Company badge / switcher ─────────────────────────────────────────────────
  companies       = signal<EmployeeCompany[]>([]);
  companyMenuOpen = signal(false);

  /**
   * Switching is only meaningful when the JWT itself carries no tenantId claim —
   * per the API, a token that already pins a tenant ignores the X-Tenant-Id
   * header entirely, so a "switch" would silently do nothing for those users.
   */
  canSwitchCompany = computed(() =>
    !this.authService.getTenantIdFromToken() && this.companies().length > 1
  );

  currentCompany = computed(() => {
    const tenantId = this.authService.getEffectiveTenantId();
    return this.companies().find(c => c.tenantId === tenantId) ?? this.companies()[0] ?? null;
  });

  ngOnInit(): void {
    this.employeeService.getMyCompanies().subscribe({
      next: (res: any) => {
        const raw  = res?.data ?? res;
        const list: EmployeeCompany[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
        this.companies.set(list);
      },
      error: () => { /* badge just stays hidden */ },
    });
  }

  toggle(): void { this.collapsed.update(v => !v); }

  toggleCompanyMenu(): void {
    if (!this.canSwitchCompany()) return;
    this.companyMenuOpen.update(v => !v);
  }

  closeCompanyMenu(): void {
    this.companyMenuOpen.set(false);
  }

  switchCompany(company: EmployeeCompany): void {
    this.companyMenuOpen.set(false);
    if (company.tenantId === this.currentCompany()?.tenantId) return;
    this.authService.setSelectedTenantId(company.tenantId);
    window.location.reload();
  }

  signOut(): void {
    this.notificationService.disconnect();
    this.authService.clearTokens();
    this.router.navigate(['/auth/login']);
  }
}
