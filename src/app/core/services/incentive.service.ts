import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { CreateIncentiveRequest, UpdateIncentiveRequest, GetIncentivesParams } from '../models/incentive.models';

@Injectable({ providedIn: 'root' })
export class IncentiveService {
  private readonly api    = inject(ApiService);
  private readonly empUrl = `${environment.apiUrl}/Employees`;

  getAll(employeeId: number, params: GetIncentivesParams): Observable<any> {
    let p = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize',   params.pageSize);
    if (params.fromDate)            p = p.set('fromDate', params.fromDate);
    if (params.toDate)              p = p.set('toDate',   params.toDate);
    if (params.type !== null && params.type !== undefined) p = p.set('type', params.type);
    return this.api.get<any>(`${this.empUrl}/${employeeId}/incentives`, p);
  }

  create(employeeId: number, payload: CreateIncentiveRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(`${this.empUrl}/${employeeId}/incentives`, payload);
  }

  update(employeeId: number, incentiveId: number, payload: UpdateIncentiveRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.empUrl}/${employeeId}/incentives/${incentiveId}`, payload);
  }

  delete(employeeId: number, incentiveId: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.empUrl}/${employeeId}/incentives/${incentiveId}`);
  }
}
