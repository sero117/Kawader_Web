import { Injectable, inject } from '@angular/core';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import {
  Company,
  CompanySetupStatus,
  CreateCompanyRequest,
  GetCompaniesParams,
  UpdateCompanyRequest,
} from '../models/company.models';
import { CompanyCurrency, GrantCompanyCurrencyRequest } from '../models/currency.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/Companies`;

  create(payload: CreateCompanyRequest): Observable<{ id: number } | ApiResponse<number>> {
    return this.api.post<{ id: number } | ApiResponse<number>>(this.baseUrl, payload);
  }

  getAll(params?: GetCompaniesParams): Observable<ApiResponse<Company[]>> {
    let p = new HttpParams();
    if (params?.pageSize)    p = p.set('PageSize',    params.pageSize);
    if (params?.pageNumber)  p = p.set('PageNumber',  params.pageNumber);
    if (params?.phoneNumber) p = p.set('PhoneNumber', params.phoneNumber);
    if (params?.email)       p = p.set('Email',       params.email);
    return this.api.get<ApiResponse<Company[]>>(this.baseUrl, p);
  }

  getById(id: number): Observable<ApiResponse<Company>> {
    return this.api.get<ApiResponse<Company>>(`${this.baseUrl}/${id}`);
  }

  update(id: number, payload: UpdateCompanyRequest): Observable<ApiResponse<unknown>> {
    return this.api.put<ApiResponse<unknown>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<unknown>> {
    return this.api.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`);
  }

  getStatus(): Observable<ApiResponse<CompanySetupStatus>> {
    return this.api.get<ApiResponse<CompanySetupStatus>>(`${this.baseUrl}/status`);
  }

  complete(formData: FormData, managerToken: string): Observable<ApiResponse<number>> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${managerToken}` });
    return this.api.patch<ApiResponse<number>>(`${this.baseUrl}/complete`, formData, headers);
  }

  freeze(id: number): Observable<{ id: number }> {
    return this.api.patch<{ id: number }>(`${this.baseUrl}/${id}/freeze`, {});
  }

  unfreeze(id: number): Observable<{ id: number }> {
    return this.api.patch<{ id: number }>(`${this.baseUrl}/${id}/unfreeze`, {});
  }

  /** Admin only — the company's granted currency set, ordered by its own priority. */
  getCurrencies(companyId: number): Observable<CompanyCurrency[]> {
    return this.api.get<CompanyCurrency[]>(`${this.baseUrl}/${companyId}/currencies`);
  }

  /** Response is { id: companyId }, not a link id. */
  grantCurrency(companyId: number, payload: GrantCompanyCurrencyRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(`${this.baseUrl}/${companyId}/currencies`, payload);
  }

  /** 412 if any employee or payroll run of this company is paid in it. */
  revokeCurrency(companyId: number, currencyId: number): Observable<void> {
    return this.api.delete<void>(`${this.baseUrl}/${companyId}/currencies/${currencyId}`);
  }
}
