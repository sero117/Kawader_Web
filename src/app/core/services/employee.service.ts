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

  getById(id: number): Observable<any> {
    return this.api.get<any>(`${this.baseUrl}/${id}`);
  }

  // Returns the uploaded file URL as a string
  uploadAttachment(id: number, file: File, type: number): Observable<string> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type.toString());
    return this.api.post<string>(`${this.baseUrl}/${id}/attachments`, fd);
  }

  // Returns 204 No Content on success, 404 if attachment never uploaded
  deleteAttachment(id: number, type: number): Observable<void> {
    return this.api.delete<void>(`${this.baseUrl}/${id}/attachments/${type}`);
  }

  getAll(params?: GetEmployeesParams): Observable<any> {
    let p = new HttpParams();
    if (params?.pageNumber) p = p.set('PageNumber', params.pageNumber);
    if (params?.pageSize)   p = p.set('PageSize',   params.pageSize);
    if (params?.tenantId)   p = p.set('TenantId',   params.tenantId);
    if (params?.phoneNumber) p = p.set('PhoneNumber', params.phoneNumber);
    return this.api.get<any>(this.baseUrl, p);
  }

  create(payload: CreateEmployeeRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateEmployeeRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.baseUrl}/${id}`);
  }
}
