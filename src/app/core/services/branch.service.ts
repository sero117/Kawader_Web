import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { Branch, CreateBranchRequest, UpdateBranchRequest, GetBranchesParams } from '../models/branch.models';
import { ApiResponse } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/Branches`;

  /** Pass silent=true for background/display lookups (e.g. resolving a
   *  branch name on an employee's overview) where HR — which has no backend
   *  permission on Branches — shouldn't see the global error toast. */
  getAll(params?: GetBranchesParams, silent = false): Observable<any> {
    let p = new HttpParams();
    if (params?.pageNumber) p = p.set('PageNumber', params.pageNumber);
    if (params?.pageSize)   p = p.set('PageSize',   params.pageSize);
    if (params?.name)       p = p.set('Name',        params.name);
    if (params?.code)       p = p.set('Code',        params.code);
    return this.api.get<any>(this.baseUrl, p, { silent });
  }

  getById(id: number, silent = false): Observable<ApiResponse<Branch>> {
    return this.api.get<ApiResponse<Branch>>(`${this.baseUrl}/${id}`, undefined, { silent });
  }

  create(payload: CreateBranchRequest): Observable<any> {
    return this.api.post<any>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateBranchRequest): Observable<ApiResponse<unknown>> {
    return this.api.put<ApiResponse<unknown>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<unknown>> {
    return this.api.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`);
  }
}
