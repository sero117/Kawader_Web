import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/** `silent: true` marks a request as best-effort/background (e.g. populating
 *  a dropdown, resolving a display name) — the auth interceptor still sends
 *  the request normally, but won't show its global error toast if it fails.
 *  Use this instead of only catching the error locally: a local `error: () =>
 *  {}` handler stops the component from breaking, but the interceptor runs
 *  first and doesn't know the caller intends to ignore the failure — without
 *  `silent`, the user still sees a confusing "no permission"/generic error
 *  toast for a failure the component itself treats as normal. */
export interface ApiRequestOptions {
  headers?: HttpHeaders;
  silent?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  private buildHeaders(options?: ApiRequestOptions): HttpHeaders | undefined {
    if (!options?.silent) return options?.headers;
    return (options.headers ?? new HttpHeaders()).set('X-Silent', 'true');
  }

  get<T>(url: string, params?: HttpParams, options?: ApiRequestOptions): Observable<T> {
    return this.http.get<T>(url, { params, headers: this.buildHeaders(options) });
  }

  post<T>(url: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http.post<T>(url, body, { headers: this.buildHeaders(options) });
  }

  /** POST with FormData — for requests that include files */
  upload<T>(url: string, formData: FormData, options?: ApiRequestOptions): Observable<T> {
    return this.http.post<T>(url, formData, { headers: this.buildHeaders(options) });
  }

  put<T>(url: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http.put<T>(url, body, { headers: this.buildHeaders(options) });
  }

  patch<T>(url: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http.patch<T>(url, body, { headers: this.buildHeaders(options) });
  }

  delete<T>(url: string, options?: ApiRequestOptions): Observable<T> {
    return this.http.delete<T>(url, { headers: this.buildHeaders(options) });
  }
}
