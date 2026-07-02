import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import {
  Device,
  DeviceEmployee,
  CreateDeviceRequest,
  UpdateDeviceRequest,
  AddDeviceEmployeeRequest,
  UpdateDeviceEmployeeRequest,
  PagedResult,
} from '../models/device.models';

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/devices`;

  // ── Devices ───────────────────────────────────────────────────────────────

  getAll(pageNumber: number, pageSize: number): Observable<PagedResult<Device>> {
    const p = new HttpParams()
      .set('PageNumber', pageNumber)
      .set('PageSize',   pageSize);
    return this.api.get<PagedResult<Device>>(this.baseUrl, p);
  }

  getById(id: number): Observable<Device> {
    return this.api.get<Device>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateDeviceRequest): Observable<{ id: number; deviceSecret: string }> {
    return this.api.post<{ id: number; deviceSecret: string }>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateDeviceRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.baseUrl}/${id}`);
  }

  regenerateSecret(id: number): Observable<{ id: number; deviceSecret: string }> {
    return this.api.post<{ id: number; deviceSecret: string }>(
      `${this.baseUrl}/${id}/regenerate-device-secret`, {},
    );
  }

  // ── Device Employees ──────────────────────────────────────────────────────

  getEmployees(deviceId: number, pageNumber: number, pageSize: number): Observable<PagedResult<DeviceEmployee>> {
    const p = new HttpParams()
      .set('PageNumber', pageNumber)
      .set('PageSize',   pageSize);
    return this.api.get<PagedResult<DeviceEmployee>>(`${this.baseUrl}/${deviceId}/employees`, p);
  }

  addEmployee(deviceId: number, payload: AddDeviceEmployeeRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(`${this.baseUrl}/${deviceId}/employees`, payload);
  }

  updateEmployee(deviceId: number, employeeDeviceId: number, payload: UpdateDeviceEmployeeRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(
      `${this.baseUrl}/${deviceId}/employees/${employeeDeviceId}`, payload,
    );
  }

  deleteEmployee(deviceId: number, employeeDeviceId: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.baseUrl}/${deviceId}/employees/${employeeDeviceId}`);
  }
}
