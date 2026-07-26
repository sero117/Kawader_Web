import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import {
  Country, CreateCountryRequest, UpdateCountryRequest, GetCountriesParams, PagedResult,
} from '../models/country.models';

@Injectable({ providedIn: 'root' })
export class CountryService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/Countries`;

  getAll(params: GetCountriesParams): Observable<PagedResult<Country>> {
    let p = new HttpParams()
      .set('PageNumber', params.pageNumber)
      .set('PageSize',   params.pageSize);
    if (params.name) p = p.set('Name', params.name);
    return this.api.get<PagedResult<Country>>(this.baseUrl, p);
  }

  getById(id: number): Observable<Country> {
    return this.api.get<Country>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateCountryRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateCountryRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.baseUrl}/${id}`);
  }
}
