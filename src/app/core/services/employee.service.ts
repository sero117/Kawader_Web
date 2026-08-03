import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/auth.models';
import {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  GetEmployeesParams,
  EmployeeCompany,
  ActiveEmployee,
  EmergencyContact,
  CreateEmergencyContactRequest,
  UpdateEmergencyContactRequest,
  EmployeeAttachment,
} from '../models/employee.models';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly api     = inject(ApiService);
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Employees`;

  getById(id: number): Observable<any> {
    return this.api.get<any>(`${this.baseUrl}/${id}`);
  }

  /** Active (Active + Probation) employees for the current tenant — used to pick employees onto a payroll run. */
  /** `currencyId` restricts the list to employees paid in that currency —
   *  only pass it where that's actually the intent (e.g. picking employees
   *  to add to a payroll run already fixed to one currency). Passing it
   *  everywhere `getActive` is used would wrongly hide employees paid in
   *  other currencies from unrelated employee pickers/counts. */
  getActive(filter?: string, currencyId?: number): Observable<ActiveEmployee[]> {
    let p = new HttpParams();
    if (filter) p = p.set('Filter', filter);
    if (currencyId) p = p.set('CurrencyId', currencyId);
    return this.api.get<ActiveEmployee[]>(`${this.baseUrl}/active`, p);
  }

  /** Companies the authenticated employee belongs to — used to resolve tenant context. */
  getMyCompanies(): Observable<any> {
    return this.api.get<any>(`${this.baseUrl}/my-companies`);
  }

  // Returns the uploaded file URL as a string
  uploadAttachment(id: number, file: File, type: number): Observable<string> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type.toString());
    return this.http.post(`${this.baseUrl}/${id}/attachments`, fd, { responseType: 'text' });
  }

  // Returns 204 No Content on success, 404 if attachment never uploaded
  deleteAttachment(id: number, type: number): Observable<void> {
    return this.api.delete<void>(`${this.baseUrl}/${id}/attachments/${type}`);
  }

  /** Plain array ordered by type, at most one per type. An employee from another
   *  company returns an empty array rather than an error/404. */
  getAttachments(id: number): Observable<EmployeeAttachment[]> {
    return this.api.get<EmployeeAttachment[]>(`${this.baseUrl}/${id}/attachments`);
  }

  getAll(params?: GetEmployeesParams): Observable<any> {
    let p = new HttpParams();
    if (params?.pageNumber)  p = p.set('PageNumber',  params.pageNumber);
    if (params?.pageSize)    p = p.set('PageSize',    params.pageSize);
    if (params?.phoneNumber) p = p.set('PhoneNumber', params.phoneNumber);
    if (params?.branchId)    p = p.set('BranchId',    params.branchId);
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

  getEmergencyContacts(empId: number): Observable<EmergencyContact[]> {
    return this.api.get<EmergencyContact[]>(`${this.baseUrl}/${empId}/emergency-contacts`);
  }

  createEmergencyContact(empId: number, payload: CreateEmergencyContactRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(`${this.baseUrl}/${empId}/emergency-contacts`, payload);
  }

  updateEmergencyContact(empId: number, contactId: number, payload: UpdateEmergencyContactRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.baseUrl}/${empId}/emergency-contacts/${contactId}`, payload);
  }

  deleteEmergencyContact(empId: number, contactId: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.baseUrl}/${empId}/emergency-contacts/${contactId}`);
  }
}
