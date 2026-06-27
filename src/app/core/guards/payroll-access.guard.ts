import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role, EmployeeType } from '../models/auth.models';

/**
 * Payroll is open to CompanyManager and general HR (HumanResourceManager with
 * no branch assigned) — narrower than companyManagerGuard's tree, so it's a
 * separate guard composed alongside it rather than widening the shared one
 * (which would also open up branches/shifts/etc. to HR).  Branch-scoped HR
 * can't be distinguished client-side (no branchId claim in the JWT) — that
 * exclusion is left to the backend's 403, same as every other authorization
 * edge case in this app.
 *
 * CompanyManager is checked via getStoredRole() (the sign-in response body's
 * `role` field), not the JWT claim — the JWT's role claim has only ever been
 * exercised for distinguishing "Employee or not" (employeeGuard,
 * needsCompanySelection()), never for resolving CompanyManager specifically,
 * and it does not reliably decode to Role.CompanyManager.
 */
export const payrollAccessGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router       = inject(Router);

  const role = authService.getStoredRole();
  if (role === Role.CompanyManager) return true;
  if (role === Role.Employee && authService.getEmployeeTypeFromToken() === EmployeeType.HumanResourceManager) {
    return true;
  }
  return router.createUrlTree([authService.getHomeRoute(role ?? undefined)]);
};
