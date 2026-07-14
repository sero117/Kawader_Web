import { Routes } from '@angular/router';
import { companyManagerGuard } from './core/guards/companymanager.guard';
import { employeeGuard } from './core/guards/employee.guard';
import { payrollAccessGuard } from './core/guards/payroll-access.guard';

export const routes: Routes = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  {
    path: 'auth',
    loadComponent: () =>
      import('./features/auth/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        title: 'تسجيل الدخول',
        data: { animation: 'login' },
        loadComponent: () =>
          import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        title: 'إنشاء حساب',
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
      {
        path: 'select-company',
        loadComponent: () =>
          import('./features/auth/select-company/select-company.component').then(m => m.SelectCompanyComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
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
        title: 'لوحة التحكم',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/admin/overview/admin-overview.component').then(m => m.AdminOverviewComponent),
      },
      {
        path: 'companies',
        title: 'الشركات',
        loadComponent: () =>
          import('./features/admin/companies/companies.component').then(m => m.CompaniesComponent),
      },
      {
        path: 'accounts',
        title: 'الحسابات',
        loadComponent: () =>
          import('./features/admin/accounts/accounts.component').then(m => m.AccountsComponent),
      },
      {
        path: 'plans',
        title: 'الخطط',
        loadComponent: () =>
          import('./features/admin/plans/plans.component').then(m => m.PlansComponent),
      },
      {
        path: 'cards',
        title: 'الكروت',
        loadComponent: () =>
          import('./features/admin/cards/cards.component').then(m => m.CardsComponent),
      },
      {
        path: 'subscriptions',
        title: 'الاشتراكات',
        loadComponent: () =>
          import('./features/admin/subscriptions/subscriptions.component').then(m => m.SubscriptionsComponent),
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
      {
        path: '',
        title: 'الرئيسية',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/companymanager/overview/manager-overview.component').then(m => m.ManagerOverviewComponent),
      },
      {
        path: 'branches',
        title: 'الفروع',
        loadComponent: () =>
          import('./features/companymanager/branches/branches.component').then(m => m.BranchesComponent),
      },
      {
        path: 'sections',
        title: 'الأقسام',
        loadComponent: () =>
          import('./features/companymanager/sections/sections.component').then(m => m.SectionsComponent),
      },
      {
        path: 'branches/:branchId/sections',
        title: 'الأقسام',
        loadComponent: () =>
          import('./features/companymanager/sections/sections.component').then(m => m.SectionsComponent),
      },
      {
        path: 'employees',
        title: 'الموظفون',
        loadComponent: () =>
          import('./features/companymanager/employees/employees.component').then(m => m.EmployeesComponent),
      },
      {
        path: 'branches/:branchId/sections/:sectionId/employees',
        title: 'الموظفون',
        loadComponent: () =>
          import('./features/companymanager/employees/employees.component').then(m => m.EmployeesComponent),
      },
      {
        path: 'shifts',
        title: 'الورديات',
        loadComponent: () =>
          import('./features/companymanager/shifts/shifts.component').then(m => m.ShiftsComponent),
      },
      {
        path: 'shift-systems',
        title: 'أنظمة الدوام',
        loadComponent: () =>
          import('./features/companymanager/shift-systems/shift-systems.component').then(m => m.ShiftSystemsComponent),
      },
      {
        path: 'shift-systems/:shiftSystemId/days',
        title: 'أيام الدوام',
        loadComponent: () =>
          import('./features/companymanager/shift-system-days/shift-system-days.component').then(m => m.ShiftSystemDaysComponent),
      },
      {
        path: 'shift-logs',
        title: 'سجلات الحضور',
        loadComponent: () =>
          import('./features/companymanager/shift-logs/shift-logs.component').then(m => m.ShiftLogsComponent),
      },
      {
        path: 'company-holidays',
        title: 'العطل الرسمية',
        loadComponent: () =>
          import('./features/companymanager/company-holidays/company-holidays.component').then(m => m.CompanyHolidaysComponent),
      },
      {
        path: 'payroll',
        title: 'الرواتب',
        canActivate: [payrollAccessGuard],
        loadComponent: () =>
          import('./features/companymanager/payroll/payroll-list/payroll-list.component').then(m => m.PayrollListComponent),
      },
      {
        path: 'payroll/:payrollRunId',
        title: 'تفاصيل الراتب',
        canActivate: [payrollAccessGuard],
        loadComponent: () =>
          import('./features/companymanager/payroll/payroll-detail/payroll-detail.component').then(m => m.PayrollDetailComponent),
      },
      {
        path: 'devices',
        title: 'إدارة الأجهزة',
        loadComponent: () =>
          import('./features/companymanager/devices/devices.component').then(m => m.DevicesComponent),
      },
      {
        path: 'adms-logs',
        title: 'سجلات البصمة',
        loadComponent: () =>
          import('./features/companymanager/adms-logs/adms-logs.component').then(m => m.AdmsLogsComponent),
      },
      {
        path: 'subscription',
        title: 'الاشتراك',
        loadComponent: () =>
          import('./features/companymanager/subscription/subscription.component').then(m => m.SubscriptionComponent),
      },
    ],
  },

  // ── Employee dashboards (one per EmployeeType) ────────────────────────────
  {
    path: 'dashboard/employee',
    canActivate: [employeeGuard],
    loadComponent: () =>
      import('./features/employee/employee-layout/employee-layout.component').then(m => m.EmployeeLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/employee/employee-overview/employee-overview.component').then(m => m.EmployeeOverviewComponent) },
    ],
  },
  {
    path: 'dashboard/hr',
    canActivate: [employeeGuard],
    loadComponent: () =>
      import('./features/employee/employee-layout/employee-layout.component').then(m => m.EmployeeLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/employee/employee-overview/employee-overview.component').then(m => m.EmployeeOverviewComponent) },
    ],
  },
  {
    path: 'dashboard/dept',
    canActivate: [employeeGuard],
    loadComponent: () =>
      import('./features/employee/employee-layout/employee-layout.component').then(m => m.EmployeeLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/employee/employee-overview/employee-overview.component').then(m => m.EmployeeOverviewComponent) },
    ],
  },
  {
    path: 'dashboard/branch',
    canActivate: [employeeGuard],
    loadComponent: () =>
      import('./features/employee/employee-layout/employee-layout.component').then(m => m.EmployeeLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/employee/employee-overview/employee-overview.component').then(m => m.EmployeeOverviewComponent) },
    ],
  },

  // ── Fallback dashboard placeholder ────────────────────────────────────────
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },

  // ── Redirects ──────────────────────────────────────────────────────────────
  { path: '',   redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth/login' },
];
