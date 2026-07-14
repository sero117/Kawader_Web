import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role, EmployeeType } from '../models/auth.models';

export const hrGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (!authService.isAuthenticated()) return router.createUrlTree(['/auth/login']);

  const role    = authService.getStoredRole();
  const empType = authService.getEmployeeTypeFromToken();

  if (role === Role.Employee && empType === EmployeeType.HumanResourceManager) return true;

  return router.createUrlTree([authService.getHomeRoute(role ?? undefined)]);
};
