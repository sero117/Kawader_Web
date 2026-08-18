import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role, EmployeeType } from '../models/auth.models';

/**
 * Blocks HR from the shift-systems management pages (create/edit shift
 * systems + their days) — HR only assigns an *existing* system to an
 * employee via the employee detail page, they don't manage the systems
 * themselves. Attach this only to the shift-systems routes under
 * `dashboard/hr` (the CompanyManager tree has no HR to redirect, so it
 * doesn't need this guard at all).
 */
export const shiftSystemsAccessGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router       = inject(Router);

  const role    = authService.getStoredRole();
  const empType = authService.getStoredEmployeeType();
  const isHr    = role === Role.Employee && empType === EmployeeType.HumanResourceManager;

  if (isHr) return router.createUrlTree([authService.getHomeRoute(role ?? undefined)]);
  return true;
};
