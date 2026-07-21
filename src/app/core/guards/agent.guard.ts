import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/auth.models';

export const agentGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  const role = authService.getStoredRole();
  if (role !== Role.Agent) {
    return router.createUrlTree([authService.getHomeRoute(role ?? undefined)]);
  }

  return true;
};
