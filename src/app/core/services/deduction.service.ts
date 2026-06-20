import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { CreateDeductionRequest, UpdateDeductionRequest, GetDeductionsParams } from '../models/deduction.models';

@Injectable({ providedIn: 'root' })
export class DeductionService {
  private readonly api    = inject(ApiService);
  private readonly empUrl = `${environment.apiUrl}/Employees`;

  getAll(employeeId: number, params: GetDeductionsParams): Observable<any> {
    let p = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize',   params.pageSize);
    if (params.fromDate)            p = p.set('fromDate', params.fromDate);
    if (params.toDate)              p = p.set('toDate',   params.toDate);
    if (params.type !== null && params.type !== undefined) p = p.set('type', params.type);
    return this.api.get<any>(`${this.empUrl}/${employeeId}/deductions`, p);
  }

  create(employeeId: number, payload: CreateDeductionRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(`${this.empUrl}/${employeeId}/deductions`, payload);
  }

  update(employeeId: number, deductionId: number, payload: UpdateDeductionRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.empUrl}/${employeeId}/deductions/${deductionId}`, payload);
  }

  delete(employeeId: number, deductionId: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.empUrl}/${employeeId}/deductions/${deductionId}`);
  }
}
