import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { Shift, CreateShiftRequest, UpdateShiftRequest, GetShiftsParams } from '../models/shift.models';

@Injectable({ providedIn: 'root' })
export class ShiftService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/Shifts`;

  getAll(params?: GetShiftsParams): Observable<any> {
    let p = new HttpParams();
    if (params?.pageNumber) p = p.set('PageNumber', params.pageNumber);
    if (params?.pageSize)   p = p.set('PageSize',   params.pageSize);
    if (params?.name)       p = p.set('Name',        params.name);
    if (params?.type !== undefined && params.type !== null) p = p.set('Type', params.type);
    return this.api.get<any>(this.baseUrl, p);
  }

  create(payload: CreateShiftRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateShiftRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.baseUrl}/${id}`);
  }
}
