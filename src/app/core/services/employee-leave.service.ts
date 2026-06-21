import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import {
  CreateEmployeeLeaveRequest, UpdateEmployeeLeaveRequest, GetEmployeeLeavesParams,
} from '../models/employee-leave.models';

@Injectable({ providedIn: 'root' })
export class EmployeeLeaveService {
  private readonly api    = inject(ApiService);
  private readonly empUrl = `${environment.apiUrl}/Employees`;

  getAll(employeeId: number, params: GetEmployeeLeavesParams): Observable<any> {
    let p = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize',   params.pageSize);
    if (params.fromDate)              p = p.set('fromDate', params.fromDate);
    if (params.toDate)                p = p.set('toDate',   params.toDate);
    if (params.isPaid !== null && params.isPaid !== undefined) p = p.set('isPaid', params.isPaid);
    return this.api.get<any>(`${this.empUrl}/${employeeId}/leaves`, p);
  }

  create(employeeId: number, payload: CreateEmployeeLeaveRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(`${this.empUrl}/${employeeId}/leaves`, payload);
  }

  update(employeeId: number, leaveId: number, payload: UpdateEmployeeLeaveRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.empUrl}/${employeeId}/leaves/${leaveId}`, payload);
  }

  delete(employeeId: number, leaveId: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.empUrl}/${employeeId}/leaves/${leaveId}`);
  }
}
