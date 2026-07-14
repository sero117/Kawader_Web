import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/auth.models';

export const employeeGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  // JWT for employees carries role as the string "Employee", not a number.
  // Number("Employee") = NaN which breaks the comparison — use the stored
  // numeric role from the sign-in response body instead.
  const role = authService.getStoredRole();
  if (role !== Role.Employee) {
    return router.createUrlTree([authService.getHomeRoute(role ?? undefined)]);
  }

  if (authService.needsCompanySelection()) {
    return router.createUrlTree(['/auth/select-company']);
  }

  return true;
};
