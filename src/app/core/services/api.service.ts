import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(url: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(url, { params });
  }

  post<T>(url: string, body: unknown): Observable<T> {
    return this.http.post<T>(url, body);
  }

  /** POST with FormData — for requests that include files */
  upload<T>(url: string, formData: FormData): Observable<T> {
    return this.http.post<T>(url, formData);
  }

  put<T>(url: string, body: unknown): Observable<T> {
    return this.http.put<T>(url, body);
  }

  patch<T>(url: string, body: unknown, headers?: HttpHeaders): Observable<T> {
    return this.http.patch<T>(url, body, { headers });
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(url);
  }
}
