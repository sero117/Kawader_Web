import { Injectable, inject } from '@angular/core';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import {
  Currency, CreateCurrencyRequest, UpdateCurrencyRequest, GetCurrenciesParams,
  CurrencyRate, GetCurrencyRatesParams, PagedResult,
} from '../models/currency.models';

const SILENT_HEADERS = new HttpHeaders().set('X-Silent', 'true');

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/Currencies`;

  /** Admin only — CompanyManager callers get 403. Use getMe() for company-manager screens. */
  getAll(params: GetCurrenciesParams): Observable<PagedResult<Currency>> {
    let p = new HttpParams()
      .set('PageNumber', params.pageNumber)
      .set('PageSize',   params.pageSize);
    if (params.code) p = p.set('Code', params.code);
    if (params.name) p = p.set('Name', params.name);
    return this.api.get<PagedResult<Currency>>(this.baseUrl, p);
  }

  getById(id: number): Observable<Currency> {
    return this.api.get<Currency>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateCurrencyRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateCurrencyRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.baseUrl}/${id}`);
  }

  /** Rate change log, newest first. There is no POST — rates change via update(). */
  getRates(id: number, params: GetCurrencyRatesParams): Observable<PagedResult<CurrencyRate>> {
    const p = new HttpParams()
      .set('PageNumber', params.pageNumber)
      .set('PageSize',   params.pageSize);
    return this.api.get<PagedResult<CurrencyRate>>(`${this.baseUrl}/${id}/rates`, p);
  }

  /** CompanyManager only — the caller's own company's allowed currencies, ordered by
   *  priority ascending. Returns a plain array (not paged); empty when nothing is
   *  granted yet — do not treat that as an error. */
  getMe(silent = false): Observable<Currency[]> {
    return this.api.get<Currency[]>(`${this.baseUrl}/me`, undefined, silent ? SILENT_HEADERS : undefined);
  }
}
