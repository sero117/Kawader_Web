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

  const token = authService.getAccessToken();
  if (!token) return router.createUrlTree(['/auth/login']);

  try {
    const claims = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
    const roleVal = claims['role'] ??
      claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    if (Number(roleVal) !== Role.Employee) {
      return router.createUrlTree([authService.getHomeRoute(Number(roleVal))]);
    }
  } catch { /* invalid token — let it through, server will reject */ }

  return true;
};
