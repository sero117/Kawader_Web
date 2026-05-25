import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { Section, CreateSectionRequest, UpdateSectionRequest, GetSectionsParams } from '../models/section.models';
import { ApiResponse } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class SectionService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/Sections`;

  getAll(params?: GetSectionsParams): Observable<any> {
    let p = new HttpParams();
    if (params?.pageNumber) p = p.set('PageNumber', params.pageNumber);
    if (params?.pageSize)   p = p.set('PageSize',   params.pageSize);
    if (params?.branchId)   p = p.set('BranchId',   params.branchId);
    if (params?.name)       p = p.set('Name',        params.name);
    if (params?.code)       p = p.set('Code',        params.code);
    return this.api.get<any>(this.baseUrl, p);
  }

  getById(id: number): Observable<ApiResponse<Section>> {
    return this.api.get<ApiResponse<Section>>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateSectionRequest): Observable<any> {
    return this.api.post<any>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateSectionRequest): Observable<ApiResponse<unknown>> {
    return this.api.put<ApiResponse<unknown>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<unknown>> {
    return this.api.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`);
  }
}
