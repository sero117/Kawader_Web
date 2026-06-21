import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { LanguageService } from '../services/language.service';
import { SnackbarService } from '../services/snackbar.service';
import { ServiceProblemDetails, extractErrorMessage } from '../models/problem-details.model';

const AUTH_ERROR_KEY = 'kawader_auth_error';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const language = inject(LanguageService);
  const snackbar = inject(SnackbarService);
  const router = inject(Router);

  let headers = req.headers.set('language', language.getLanguage());

  if (!req.headers.has('Authorization')) {
    const token = auth.getAccessToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (!req.headers.has('X-Tenant-Id')) {
    const tenantId = auth.getSelectedTenantId();
    if (tenantId) {
      headers = headers.set('X-Tenant-Id', tenantId);
    }
  }

  return next(req.clone({ headers })).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 403 && auth.isAuthenticated()) {
        // Account locked / company frozen / employee access denied, etc. —
        // the user no longer has valid access, so kick them out instead of
        // leaving them stuck on a half-working dashboard behind a toast
        // that disappears in a few seconds.
        const problem = err.error as ServiceProblemDetails | null;
        const message = extractErrorMessage(problem) ?? language.t('errors.unexpected');
        sessionStorage.setItem(AUTH_ERROR_KEY, message);
        auth.clearTokens();
        router.navigate(['/auth/login']);
      } else if (err.status !== 404) {
        const problem = err.error as ServiceProblemDetails | null;
        const message = extractErrorMessage(problem) ?? language.t('errors.unexpected');
        snackbar.show(message, 'error');
      }
      return throwError(() => err);
    }),
  );
};
