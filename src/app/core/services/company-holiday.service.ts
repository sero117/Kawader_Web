import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import {
  CreateCompanyHolidayRequest, UpdateCompanyHolidayRequest, GetCompanyHolidaysParams,
} from '../models/company-holiday.models';

@Injectable({ providedIn: 'root' })
export class CompanyHolidayService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/company-holidays`;

  getAll(params: GetCompanyHolidaysParams): Observable<any> {
    let p = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize',   params.pageSize);
    if (params.name) p = p.set('name', params.name);
    if (params.year) p = p.set('year', params.year);
    return this.api.get<any>(this.baseUrl, p);
  }

  create(payload: CreateCompanyHolidayRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateCompanyHolidayRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.baseUrl}/${id}`);
  }
}
