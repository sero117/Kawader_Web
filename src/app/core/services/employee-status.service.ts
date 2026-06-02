import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import {
  EmployeeStatusHistory,
  CreateStatusHistoryRequest,
  UpdateStatusHistoryRequest,
  GetStatusHistoryParams,
} from '../models/employee.models';
import { ApiResponse } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class EmployeeStatusService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/Employees`;

  getAll(
    employeeId: number,
    params: GetStatusHistoryParams,
  ): Observable<ApiResponse<{ items: EmployeeStatusHistory[]; totalCount: number; pageNumber: number; pageSize: number }>> {
    let p = new HttpParams()
      .set('PageNumber', params.pageNumber)
      .set('PageSize',   params.pageSize);
    if (params.status !== undefined) p = p.set('Status', params.status);
    return this.api.get(`${this.baseUrl}/${employeeId}/status-history`, p);
  }

  create(employeeId: number, payload: CreateStatusHistoryRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(`${this.baseUrl}/${employeeId}/status-history`, payload);
  }

  update(employeeId: number, historyId: number, payload: UpdateStatusHistoryRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.baseUrl}/${employeeId}/status-history/${historyId}`, payload);
  }

  delete(employeeId: number, historyId: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.baseUrl}/${employeeId}/status-history/${historyId}`);
  }
}
