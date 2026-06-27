import { Injectable, inject } from '@angular/core';
import { HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import {
  PayrollRun,
  PayrollRunDetail,
  PayrollStatus,
  ProcessingStatus,
  CreatePayrollRequest,
  UpdatePayrollRequest,
  AddPayslipsRequest,
  UpdatePayslipRequest,
  GetPayrollsParams,
  GetPayrollDetailParams,
  PagedResult,
} from '../models/payroll.models';

const SILENT_HEADERS = new HttpHeaders().set('X-Silent', 'true');

// The API may return numeric enum values instead of string literals.
const STATUS_MAP: Record<number, PayrollStatus> = { 0: 'Draft', 1: 'Approved', 2: 'Paid' };
const PROC_MAP: Record<number, ProcessingStatus> = { 0: 'Idle', 1: 'Processing', 2: 'Completed', 3: 'Failed' };

function normalizeRun(r: any): PayrollRun {
  return {
    ...r,
    status:           STATUS_MAP[r.status]           ?? r.status,
    processingStatus: PROC_MAP[r.processingStatus]   ?? r.processingStatus,
  };
}

function normalizeDetail(r: any): PayrollRunDetail {
  return { ...normalizeRun(r), payslips: r.payslips ?? [] };
}

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/payrolls`;

  getAll(params: GetPayrollsParams): Observable<PagedResult<PayrollRun>> {
    let p = new HttpParams()
      .set('PageNumber', params.pageNumber)
      .set('PageSize',   params.pageSize);
    if (params.status) p = p.set('Status', params.status);
    return this.api.get<any>(this.baseUrl, p).pipe(
      map(res => ({ ...res, items: (res.items ?? []).map(normalizeRun) })),
    );
  }

  getById(payrollRunId: number, params?: GetPayrollDetailParams, silent = false): Observable<PayrollRunDetail> {
    let p = new HttpParams();
    if (params?.employeeName) p = p.set('EmployeeName', params.employeeName);
    return this.api.get<any>(
      `${this.baseUrl}/${payrollRunId}`,
      p,
      silent ? SILENT_HEADERS : undefined,
    ).pipe(map(normalizeDetail));
  }

  create(payload: CreatePayrollRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(this.baseUrl, payload);
  }

  update(payrollRunId: number, payload: UpdatePayrollRequest): Observable<void> {
    return this.api.put<void>(`${this.baseUrl}/${payrollRunId}`, payload);
  }

  delete(payrollRunId: number): Observable<void> {
    return this.api.delete<void>(`${this.baseUrl}/${payrollRunId}`);
  }

  addPayslips(payrollRunId: number, payload: AddPayslipsRequest): Observable<void> {
    return this.api.post<void>(`${this.baseUrl}/${payrollRunId}/payslips`, payload);
  }

  updatePayslip(payrollRunId: number, payslipId: number, payload: UpdatePayslipRequest): Observable<void> {
    return this.api.put<void>(`${this.baseUrl}/${payrollRunId}/payslips/${payslipId}`, payload);
  }

  deletePayslip(payrollRunId: number, payslipId: number): Observable<void> {
    return this.api.delete<void>(`${this.baseUrl}/${payrollRunId}/payslips/${payslipId}`);
  }

  approve(payrollRunId: number): Observable<void> {
    return this.api.put<void>(`${this.baseUrl}/${payrollRunId}/approve`, {});
  }

  pay(payrollRunId: number): Observable<void> {
    return this.api.put<void>(`${this.baseUrl}/${payrollRunId}/pay`, {});
  }
}
