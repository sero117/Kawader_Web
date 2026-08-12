import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { LanguageService } from '../services/language.service';
import { SnackbarService } from '../services/snackbar.service';
import { ServiceProblemDetails, extractErrorMessage } from '../models/problem-details.model';
import { translateBackendMessage } from '../utils/backend-error-translations';

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

// Module-level (not per-request) on purpose: this file is a functional
// interceptor, so every invocation runs in the same module scope and shares
// this variable like a singleton. Without that sharing, N requests that all
// 401 at once (e.g. a forkJoin firing 5 calls on page load with an expired
// token) would each start their own refresh call — if the backend rotates
// refresh tokens on use, only the first succeeds and the rest force-logout a
// session that had just been legitimately renewed a moment earlier.
let refreshInFlight$: Observable<string> | null = null;

/** Ensures at most one /Identity/refresh-token call is ever in flight at a
 *  time. Concurrent callers all subscribe to the same shared Observable
 *  (via shareReplay) and get the same resulting token — or the same error —
 *  instead of each triggering their own HTTP call. Resets itself once the
 *  call settles so the next expiry starts a fresh refresh. */
function refreshAccessToken(auth: AuthService): Observable<string> {
  if (refreshInFlight$) return refreshInFlight$;

  const refreshTok = auth.getRefreshToken();
  const userId = auth.getUserId();
  if (!refreshTok || userId == null) {
    return throwError(() => new Error('No refresh token available'));
  }

  refreshInFlight$ = auth.refreshToken({ userId, refreshToken: refreshTok }).pipe(
    map(res => {
      const tokens = res?.data;
      const newAccess = tokens?.accessToken ?? tokens?.token;
      if (!newAccess) throw new Error('Refresh response missing access token');
      auth.saveTokens(tokens);
      return newAccess as string;
    }),
    shareReplay(1),
    finalize(() => { refreshInFlight$ = null; }),
  );

  return refreshInFlight$;
}

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
    // getSelectedTenantId() alone only covers the multi-company employee
    // picker flow — a normal HR/CompanyManager token carries its own tenantId
    // claim and was never "selected" anywhere, so that lookup came back empty
    // and the header silently never got sent. getEffectiveTenantId() checks
    // the JWT claim first and falls back to the manual selection.
    const tenantId = auth.getEffectiveTenantId();
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

      // 401 = no/expired token. Try a refresh (shared across any other
      // requests that 401 at the same moment — see refreshAccessToken above)
      // and retry this request with the new token; if there's no refresh
      // token or the refresh itself fails, send the user to login instead of
      // leaving them stuck on a broken page.
      if (err.status === 401 && !isAuthUrl) {
        return refreshAccessToken(auth).pipe(
          switchMap(newAccess => next(req.clone({ headers: headers.set('Authorization', `Bearer ${newAccess}`) }))),
          catchError(() => {
            auth.clearTokens();
            router.navigate(['/auth/login']);
            return throwError(() => err);
          }),
        );
      }

      // A 403 specifically on /Companies/status plausibly means the account's
      // company is frozen — force logout so the user isn't left staring at a
      // page that can't load anything. Any OTHER GET 403 is a targeted
      // permission denial for that one call, not proof the account itself is
      // dead (and was previously mistaken for "frozen" here, forcing a
      // logout on every account whenever *any* background call 403'd for an
      // unrelated reason) — fall through to the normal error toast instead.
      if (err.status === 403 && auth.isAuthenticated() && req.method === 'GET' && req.url.includes('/Companies/status')) {
        const role = auth.getStoredRole();
        const isHr = role === 1 && auth.getStoredEmployeeType() === 1;
        // /Companies/status is only ever authorized for CompanyManager and HR
        // in the first place — a non-HR employee (regular, department
        // manager, branch manager) gets a bare 403 here on every login
        // regardless of frozen status, since they were never allowed to call
        // it at all. Treating that as "frozen" force-logged out every
        // non-HR employee account. Only CompanyManager/HR — the roles that
        // actually succeed here when not frozen — make a 403 here plausible
        // evidence of an actual freeze.
        const canBeFrozen = role === 2 /* CompanyManager */ || isHr;
        if (isHr || !canBeFrozen) {
          // Background data fetch failed silently — component handles the
          // empty/error state itself; no toast needed (avoids spam on branch/device calls).
          return throwError(() => err);
        }
        const problem = err.error as ServiceProblemDetails | null;
        const message = translateBackendMessage(extractErrorMessage(problem) ?? language.t('errors.unexpected'));
        auth.clearTokens();
        // Show it directly via snackbar rather than stashing it in
        // sessionStorage for the login page to pick up — this 403 often
        // fires while a route guard for a *different* pending navigation
        // (e.g. companyManagerGuard's own status check right after login)
        // is still resolving, so router.navigate(['/auth/login']) below can
        // be a no-op (Router still considers it the current URL). A
        // sessionStorage relay would then sit unconsumed and resurface on
        // whatever unrelated later visit to /auth/login happens to mount
        // the component next (e.g. a normal sign-out) — the snackbar has no
        // such lag, it fires now, once, regardless of routing.
        snackbar.show(message, 'error');
        router.navigate(['/auth/login']);
        return throwError(() => err);
      }

      // Auth-flow endpoints (login, signup, company-setup, activation, ...)
      // always show their own inline/local error for the response body — the
      // generic toast here would just duplicate that same message.
      if (err.status !== 404 && !isAuthUrl) {
        const problem = err.error as ServiceProblemDetails | null;
        // A bare 403 (e.g. the HR [EmployeeAccess] role/branch gate) often
        // carries no response body at all — "unexpected error" would be
        // actively misleading for what is actually a deliberate permission
        // denial, so it gets its own fallback instead of the generic one.
        const fallback = err.status === 403 ? language.t('errors.forbidden') : language.t('errors.unexpected');
        const rawMessage = extractErrorMessage(problem) ?? fallback;
        snackbar.show(translateBackendMessage(rawMessage), 'error');
      }
      return throwError(() => err);
    }),
  );
};
