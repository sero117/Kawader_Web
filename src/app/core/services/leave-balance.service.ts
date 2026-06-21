import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import {
  CreateLeaveBalanceRequest, UpdateLeaveBalanceRequest, CarryOverLeaveBalanceRequest,
} from '../models/leave-balance.models';

@Injectable({ providedIn: 'root' })
export class LeaveBalanceService {
  private readonly api    = inject(ApiService);
  private readonly empUrl = `${environment.apiUrl}/Employees`;

  getByYear(employeeId: number, year: number): Observable<any> {
    return this.api.get<any>(`${this.empUrl}/${employeeId}/leave-balance/${year}`);
  }

  create(employeeId: number, payload: CreateLeaveBalanceRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(`${this.empUrl}/${employeeId}/leave-balance`, payload);
  }

  update(employeeId: number, balanceId: number, payload: UpdateLeaveBalanceRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.empUrl}/${employeeId}/leave-balance/${balanceId}`, payload);
  }

  carryOver(employeeId: number, payload: CarryOverLeaveBalanceRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(`${this.empUrl}/${employeeId}/leave-balance/carry-over`, payload);
  }
}
