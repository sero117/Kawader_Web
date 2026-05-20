import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import {
  Company,
  CompanyStatus,
  CreateCompanyRequest,
  GetCompaniesParams,
  UpdateCompanyRequest,
} from '../models/company.models';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.companiesApiUrl;

  create(payload: CreateCompanyRequest): Observable<{ id: number } | ApiResponse<number>> {
    return this.http.post<{ id: number } | ApiResponse<number>>(this.baseUrl, payload);
  }

  getAll(params?: GetCompaniesParams): Observable<ApiResponse<Company[]>> {
    let p = new HttpParams();
    if (params?.pageSize)    p = p.set('PageSize',    params.pageSize);
    if (params?.pageNumber)  p = p.set('PageNumber',  params.pageNumber);
    if (params?.phoneNumber) p = p.set('PhoneNumber', params.phoneNumber);
    if (params?.email)       p = p.set('Email',       params.email);
    return this.http.get<ApiResponse<Company[]>>(this.baseUrl, { params: p });
  }

  getById(id: number): Observable<ApiResponse<Company>> {
    return this.http.get<ApiResponse<Company>>(`${this.baseUrl}/${id}`);
  }

  update(id: number, payload: UpdateCompanyRequest): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`);
  }

  getStatus(): Observable<ApiResponse<CompanyStatus[]>> {
    return this.http.get<ApiResponse<CompanyStatus[]>>(`${this.baseUrl}/status`);
  }

  complete(formData: FormData, managerToken: string): Observable<ApiResponse<number>> {
    return this.http.patch<ApiResponse<number>>(
      `${this.baseUrl}/complete`,
      formData,
      { headers: new HttpHeaders({ Authorization: `Bearer ${managerToken}` }) }
    );
  }
}
