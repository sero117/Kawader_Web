import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { CompanyService } from '../services/company.service';
import { AuthService } from '../services/auth.service';
import { Role, EmployeeType } from '../models/auth.models';

export const companyManagerGuard: CanActivateFn = () => {
  const companyService = inject(CompanyService);
  const authService    = inject(AuthService);
  const router         = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  const role       = authService.getRoleFromToken();
  const empType    = authService.getEmployeeTypeFromToken();
  const isAllowed  = role === Role.CompanyManager ||
                    (role === Role.Employee && empType === EmployeeType.HumanResourceManager);

  if (!isAllowed) {
    return router.createUrlTree([authService.getHomeRoute(role ?? undefined)]);
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
