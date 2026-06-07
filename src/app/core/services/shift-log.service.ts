import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { CreateShiftLogRequest, UpdateShiftLogRequest, GetShiftLogsParams } from '../models/shift.models';

@Injectable({ providedIn: 'root' })
export class ShiftLogService {
  private readonly api    = inject(ApiService);
  private readonly empUrl = `${environment.apiUrl}/Employees`;

  getAll(params: GetShiftLogsParams): Observable<any> {
    let p = new HttpParams()
      .set('PageNumber', params.pageNumber)
      .set('PageSize',   params.pageSize);
    if (params.employeeId)    p = p.set('EmployeeId',    params.employeeId);
    if (params.shiftSystemId) p = p.set('ShiftSystemId', params.shiftSystemId);
    if (params.fromDate)      p = p.set('FromDate',      params.fromDate);
    if (params.toDate)        p = p.set('ToDate',        params.toDate);
    return this.api.get<any>(`${this.empUrl}/shift-logs`, p);
  }

  create(employeeId: number, payload: CreateShiftLogRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(`${this.empUrl}/${employeeId}/shift-logs`, payload);
  }

  update(employeeId: number, logId: number, payload: UpdateShiftLogRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.empUrl}/${employeeId}/shift-logs/${logId}`, payload);
  }

  delete(employeeId: number, logId: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.empUrl}/${employeeId}/shift-logs/${logId}`);
  }
}
