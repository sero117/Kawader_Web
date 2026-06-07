import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import {
  ShiftSystem, CreateShiftSystemRequest, UpdateShiftSystemRequest, GetShiftSystemsParams,
  ShiftSystemDay, CreateShiftSystemDayRequest, UpdateShiftSystemDayRequest,
  EmployeeShiftSystem, AssignShiftSystemRequest,
} from '../models/shift.models';

@Injectable({ providedIn: 'root' })
export class ShiftSystemService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/ShiftSystems`;
  private readonly empUrl  = `${environment.apiUrl}/Employees`;

  // ── Systems ───────────────────────────────────────────────────────────────

  getAll(params?: GetShiftSystemsParams): Observable<any> {
    let p = new HttpParams();
    if (params?.pageNumber) p = p.set('PageNumber', params.pageNumber);
    if (params?.pageSize)   p = p.set('PageSize',   params.pageSize);
    if (params?.name)       p = p.set('Name',        params.name);
    return this.api.get<any>(this.baseUrl, p);
  }

  create(payload: CreateShiftSystemRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateShiftSystemRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.baseUrl}/${id}`);
  }

  // ── Days ──────────────────────────────────────────────────────────────────

  getDays(shiftSystemId: number): Observable<ShiftSystemDay[]> {
    return this.api.get<ShiftSystemDay[]>(`${this.baseUrl}/${shiftSystemId}/days`);
  }

  createDay(shiftSystemId: number, payload: CreateShiftSystemDayRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(`${this.baseUrl}/${shiftSystemId}/days`, payload);
  }

  updateDay(shiftSystemId: number, dayId: number, payload: UpdateShiftSystemDayRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.baseUrl}/${shiftSystemId}/days/${dayId}`, payload);
  }

  deleteDay(shiftSystemId: number, dayId: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.baseUrl}/${shiftSystemId}/days/${dayId}`);
  }

  // ── Employee Assignment ───────────────────────────────────────────────────

  getEmployeeShiftSystem(employeeId: number): Observable<EmployeeShiftSystem> {
    return this.api.get<EmployeeShiftSystem>(`${this.empUrl}/${employeeId}/shift-system`);
  }

  assignEmployee(employeeId: number, payload: AssignShiftSystemRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(`${this.empUrl}/${employeeId}/shift-assignment`, payload);
  }

  unassignEmployee(employeeId: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.empUrl}/${employeeId}/shift-assignment`);
  }
}
