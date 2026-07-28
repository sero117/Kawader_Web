import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { LanguageService } from '../services/language.service';
import { SnackbarService } from '../services/snackbar.service';
import { ServiceProblemDetails, extractErrorMessage } from '../models/problem-details.model';
import { translateBackendMessage } from '../utils/backend-error-translations';

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

      // 401 = no/expired token. If a refresh token is on hand, try it once and
      // retry the original request; otherwise (or if refresh itself fails) send
      // the user to login instead of leaving them stuck on a broken page.
      if (err.status === 401 && !isAuthUrl) {
        const refreshTok = auth.getRefreshToken();
        const userId = auth.getUserId();
        if (refreshTok && userId != null) {
          return auth.refreshToken({ userId, refreshToken: refreshTok }).pipe(
            switchMap(res => {
              const tokens = res?.data;
              const newAccess = tokens?.accessToken ?? tokens?.token;
              if (!newAccess) return throwError(() => err);
              auth.saveTokens(tokens);
              const retryHeaders = headers.set('Authorization', `Bearer ${newAccess}`);
              return next(req.clone({ headers: retryHeaders }));
            }),
            catchError(() => {
              auth.clearTokens();
              router.navigate(['/auth/login']);
              return throwError(() => err);
            }),
          );
        }
        auth.clearTokens();
        router.navigate(['/auth/login']);
        return throwError(() => err);
      }

      // A 403 on a background GET plausibly means the whole session/account is no
      // longer valid (frozen company, suspended employee, ...) — force logout so
      // the user isn't left staring at a page that can't load anything. A 403 on a
      // specific action (POST/PUT/DELETE, e.g. redeeming a subscription card) is a
      // targeted permission denial for just that operation, not proof the account
      // itself is dead — fall through to the normal error toast instead of nuking
      // the session over one blocked action.
      if (err.status === 403 && auth.isAuthenticated() && req.method === 'GET') {
        const role = auth.getStoredRole();
        const isHr = role === 1 && auth.getStoredEmployeeType() === 1;
        // Only CompanyManager/Employee accounts are tenant-scoped and can
        // plausibly be frozen/suspended — an Admin or Agent 403 here just means
        // this one background call hit a permission it shouldn't have, not that
        // their account is dead, so don't force-logout them over it.
        const canBeFrozen = role === 2 /* CompanyManager */ || role === 1 /* Employee */;
        if (isHr || !canBeFrozen) {
          // Background data fetch failed silently — component handles the
          // empty/error state itself; no toast needed (avoids spam on branch/device calls).
          return throwError(() => err);
        }
        const problem = err.error as ServiceProblemDetails | null;
        const message = translateBackendMessage(extractErrorMessage(problem) ?? language.t('errors.unexpected'));
        sessionStorage.setItem(AUTH_ERROR_KEY, message);
        auth.clearTokens();
        // Also show it directly, right now — this 403 often fires while a
        // route guard for a *different* pending navigation (e.g. the
        // companyManagerGuard's own status check right after login) is still
        // resolving. Navigating to '/auth/login' below can be a no-op in
        // that case (Router still considers it the current URL until the
        // other navigation settles), which would silently drop the message
        // that sessionStorage + the login page's ngOnInit rely on.
        snackbar.show(message, 'error');
        router.navigate(['/auth/login']);
        return throwError(() => err);
      }

      // Auth-flow endpoints (login, signup, company-setup, activation, ...)
      // always show their own inline/local error for the response body — the
      // generic toast here would just duplicate that same message.
      if (err.status !== 404 && !isAuthUrl) {
        const problem = err.error as ServiceProblemDetails | null;
        const rawMessage = extractErrorMessage(problem) ?? language.t('errors.unexpected');
        snackbar.show(translateBackendMessage(rawMessage), 'error');
      }
      return throwError(() => err);
    }),
  );
};
