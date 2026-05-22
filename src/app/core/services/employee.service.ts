import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/auth.models';
import {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  GetEmployeesParams,
} from '../models/employee.models';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/Employees`;

  getAll(params?: GetEmployeesParams): Observable<any> {
    let p = new HttpParams();
    if (params?.pageNumber) p = p.set('PageNumber', params.pageNumber);
    if (params?.pageSize)   p = p.set('PageSize',   params.pageSize);
    if (params?.tenantId)   p = p.set('TenantId',   params.tenantId);
    if (params?.phoneNumber) p = p.set('PhoneNumber', params.phoneNumber);
    return this.api.get<any>(this.baseUrl, p);
  }

  create(payload: CreateEmployeeRequest): Observable<any> {
    return this.api.post<any>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateEmployeeRequest): Observable<ApiResponse<unknown>> {
    return this.api.put<ApiResponse<unknown>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<unknown>> {
    return this.api.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`);
  }
}
