import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { LanguageService } from '../services/language.service';
import { SnackbarService } from '../services/snackbar.service';
import { ServiceProblemDetails, extractErrorMessage } from '../models/problem-details.model';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const language = inject(LanguageService);
  const snackbar = inject(SnackbarService);

  let headers = req.headers.set('language', language.getLanguage());

  if (!req.headers.has('Authorization')) {
    const token = auth.getAccessToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return next(req.clone({ headers })).pipe(
    catchError((err: HttpErrorResponse) => {
      const problem = err.error as ServiceProblemDetails | null;
      const message = extractErrorMessage(problem) ?? language.t('errors.unexpected');
      snackbar.show(message, 'error');
      return throwError(() => err);
    }),
  );
};
