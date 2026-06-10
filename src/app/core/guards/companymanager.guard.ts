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
    catchError(() => of(true)),
  );
};
