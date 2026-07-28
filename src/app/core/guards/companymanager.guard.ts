import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { CompanyService } from '../services/company.service';
import { AuthService } from '../services/auth.service';

export const companyManagerGuard: CanActivateFn = () => {
  const companyService = inject(CompanyService);
  const authService    = inject(AuthService);
  const router         = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  return companyService.getStatus().pipe(
    map((res: any) => {
      const isCompleted: boolean =
        res?.data?.isCompleted ?? res?.data?.IsCompleted ??
        res?.isCompleted ?? res?.IsCompleted ?? false;
      if (!isCompleted) {
        return router.createUrlTree(['/auth/company-setup']);
      }
      return true;
    }),
    // A failed status check (e.g. a frozen account returning 403) must not
    // silently wave the user into the dashboard — the interceptor already
    // redirects to login with the real reason on this same error, and
    // letting the guard also say "allowed" raced against that redirect and
    // could leave the user stuck on a half-navigated page.
    catchError(() => of(false)),
  );
};
