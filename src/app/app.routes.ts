import { Routes } from '@angular/router';
import { companyManagerGuard } from './core/guards/companymanager.guard';

export const routes: Routes = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  {
    path: 'auth',
    loadComponent: () =>
      import('./features/auth/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        data: { animation: 'login' },
        loadComponent: () =>
          import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        data: { animation: 'register' },
        loadComponent: () =>
          import('./features/auth/register/register.component').then(m => m.RegisterComponent),
      },
      {
        path: 'confirm-code',
        loadComponent: () =>
          import('./features/auth/confirm-code/confirm-code.component').then(m => m.ConfirmCodeComponent),
      },
      {
        path: 'company-setup',
        loadComponent: () =>
          import('./features/auth/company-setup/company-setup.component').then(m => m.CompanySetupComponent),
      },
      {
        path: 'employee-activation',
        loadComponent: () =>
          import('./features/auth/employee-activation/employee-activation.component').then(m => m.EmployeeActivationComponent),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // ── Admin dashboard ────────────────────────────────────────────────────────
  {
    path: 'dashboard/admin',
    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/admin/overview/admin-overview.component').then(m => m.AdminOverviewComponent),
      },
      {
        path: 'companies',
        loadComponent: () =>
          import('./features/admin/companies/companies.component').then(m => m.CompaniesComponent),
      },
      {
        path: 'accounts',
        loadComponent: () =>
          import('./features/admin/accounts/accounts.component').then(m => m.AccountsComponent),
      },
    ],
  },

  // ── Company Manager dashboard ─────────────────────────────────────────────
  {
    path: 'dashboard/manager',
    canActivate: [companyManagerGuard],
    loadComponent: () =>
      import('./features/companymanager/companymanager-layout/companymanager-layout.component').then(m => m.CompanyManagerLayoutComponent),
    children: [
      { path: '', redirectTo: 'branches', pathMatch: 'full' },
      {
        path: 'branches',
        loadComponent: () =>
          import('./features/companymanager/branches/branches.component').then(m => m.BranchesComponent),
      },
      {
        path: 'branches/:branchId/sections',
        loadComponent: () =>
          import('./features/companymanager/sections/sections.component').then(m => m.SectionsComponent),
      },
      {
        path: 'branches/:branchId/sections/:sectionId/employees',
        loadComponent: () =>
          import('./features/companymanager/employees/employees.component').then(m => m.EmployeesComponent),
      },
      {
        path: 'shifts',
        loadComponent: () =>
          import('./features/companymanager/shifts/shifts.component').then(m => m.ShiftsComponent),
      },
      {
        path: 'shift-systems',
        loadComponent: () =>
          import('./features/companymanager/shift-systems/shift-systems.component').then(m => m.ShiftSystemsComponent),
      },
      {
        path: 'shift-systems/:shiftSystemId/days',
        loadComponent: () =>
          import('./features/companymanager/shift-system-days/shift-system-days.component').then(m => m.ShiftSystemDaysComponent),
      },
      {
        path: 'shift-logs',
        loadComponent: () =>
          import('./features/companymanager/shift-logs/shift-logs.component').then(m => m.ShiftLogsComponent),
      },
    ],
  },

  // ── Employee / Manager dashboard (placeholder) ────────────────────────────
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },

  // ── Redirects ──────────────────────────────────────────────────────────────
  { path: '',   redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth/login' },
];
