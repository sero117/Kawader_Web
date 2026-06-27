import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import {
  CreateLeaveBalanceRequest, UpdateLeaveBalanceRequest, CarryOverLeaveBalanceRequest,
} from '../models/leave-balance.models';

@Injectable({ providedIn: 'root' })
export class LeaveBalanceService {
  private readonly api      = inject(ApiService);
  private readonly empUrl   = `${environment.apiUrl}/Employees`;
  private readonly baseUrl  = `${environment.apiUrl}/leave-balances`;

  /** GET /leave-balances — company-wide list, optionally filtered by employee + year */
  getAll(params?: { pageNumber?: number; pageSize?: number; year?: number; employeeId?: number }): Observable<any> {
    let p = new HttpParams();
    if (params?.pageNumber) p = p.set('PageNumber', params.pageNumber);
    if (params?.pageSize)   p = p.set('PageSize',   params.pageSize);
    if (params?.year)       p = p.set('Year',       params.year);
    if (params?.employeeId) p = p.set('EmployeeId', params.employeeId);
    return this.api.get<any>(this.baseUrl, p);
  }

  /** Returns a single employee's leave balance for a given year via GET /leave-balances */
  getByYear(employeeId: number, year: number): Observable<any> {
    return this.getAll({ employeeId, year, pageNumber: 1, pageSize: 1 });
  }

  create(employeeId: number, payload: CreateLeaveBalanceRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(`${this.empUrl}/${employeeId}/leave-balance`, payload);
  }

  update(employeeId: number, balanceId: number, payload: UpdateLeaveBalanceRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.empUrl}/${employeeId}/leave-balance/${balanceId}`, payload);
  }

  delete(employeeId: number, balanceId: number): Observable<void> {
    return this.api.delete<void>(`${this.empUrl}/${employeeId}/leave-balance/${balanceId}`);
  }

  carryOver(employeeId: number, payload: CarryOverLeaveBalanceRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(`${this.empUrl}/${employeeId}/leave-balance/carry-over`, payload);
  }
}
