import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { LanguageService } from '../services/language.service';
import { SnackbarService } from '../services/snackbar.service';
import { ServiceProblemDetails, extractErrorMessage } from '../models/problem-details.model';

const AUTH_ERROR_KEY = 'kawader_auth_error';

const SUCCESS_KEY: Record<string, string> = {
  POST:   'common.success.added',
  PUT:    'common.success.updated',
  DELETE: 'common.success.deleted',
  PATCH:  'common.success.updated',
};

const AUTH_URL_FRAGMENTS = [
  '/Account/', '/auth/',
  '/Identity/signin',
  '/Identity/signup',
  '/Identity/refresh-token',
  '/Identity/generate-code',
  '/Identity/confirm-code',
  '/Identity/reset-password',
  '/Identity/complete-company-info',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const language = inject(LanguageService);
  const snackbar = inject(SnackbarService);
  const router = inject(Router);

  const silent = req.headers.has('X-Silent');
  let headers = req.headers
    .set('language', language.getLanguage())
    .set('ngrok-skip-browser-warning', 'true');
  if (silent) headers = headers.delete('X-Silent');

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

  const isMutation = req.method in SUCCESS_KEY;
  const isAuthUrl  = AUTH_URL_FRAGMENTS.some(f => req.url.includes(f));

  return next(req.clone({ headers })).pipe(
    tap(event => {
      if (silent || !isMutation || isAuthUrl) return;
      if (event instanceof HttpResponse && event.status >= 200 && event.status < 300) {
        snackbar.show(language.t(SUCCESS_KEY[req.method]), 'success');
      }
    }),
    catchError((err: HttpErrorResponse) => {
      if (silent) {
        return throwError(() => err);
      }

      if (err.status === 403 && auth.isAuthenticated()) {
        // HR users legitimately get 403 on CompanyManager-only endpoints — don't logout,
        // just show the error toast so they know the page isn't available to them.
        const isHr = auth.getStoredRole() === 1 && auth.getStoredEmployeeType() === 1;
        if (!isHr) {
          // CompanyManager: account locked / frozen / employee suspended — force logout.
          const problem = err.error as ServiceProblemDetails | null;
          const message = extractErrorMessage(problem) ?? language.t('errors.unexpected');
          sessionStorage.setItem(AUTH_ERROR_KEY, message);
          auth.clearTokens();
          router.navigate(['/auth/login']);
          return throwError(() => err);
        }
        // HR: fall through to the toast below.
      }

      if (err.status !== 404) {
        const problem = err.error as ServiceProblemDetails | null;
        const message = extractErrorMessage(problem) ?? language.t('errors.unexpected');
        snackbar.show(message, 'error');
      }
      return throwError(() => err);
    }),
  );
};
