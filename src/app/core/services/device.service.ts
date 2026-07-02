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
  PagedResult,
} from '../models/device.models';

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/Devices`;

  getAll(pageNumber: number, pageSize: number): Observable<PagedResult<Device>> {
    const p = new HttpParams()
      .set('PageNumber', pageNumber)
      .set('PageSize',   pageSize);
    return this.api.get<PagedResult<Device>>(this.baseUrl, p);
  }

  getById(id: number): Observable<Device> {
    return this.api.get<Device>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateDeviceRequest): Observable<any> {
    return this.api.post<any>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateDeviceRequest): Observable<void> {
    return this.api.put<void>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`${this.baseUrl}/${id}`);
  }

  regenerateSecret(id: number): Observable<any> {
    return this.api.post<any>(`${this.baseUrl}/${id}/regenerate-device-secret`, {});
  }

  getEmployees(deviceId: number, pageNumber: number, pageSize: number): Observable<PagedResult<DeviceEmployee>> {
    const p = new HttpParams()
      .set('PageNumber', pageNumber)
      .set('PageSize',   pageSize);
    return this.api.get<PagedResult<DeviceEmployee>>(`${this.baseUrl}/${deviceId}/employees`, p);
  }

  addEmployee(deviceId: number, payload: AddDeviceEmployeeRequest): Observable<void> {
    return this.api.post<void>(`${this.baseUrl}/${deviceId}/employees`, payload);
  }

  deleteEmployee(deviceId: number, employeeDeviceId: number): Observable<void> {
    return this.api.delete<void>(`${this.baseUrl}/${deviceId}/employees/${employeeDeviceId}`);
  }
}
