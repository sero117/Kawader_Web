import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { Plan, CreatePlanRequest, UpdatePlanRequest, GetPlansParams } from '../models/plan.models';

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/Plans`;

  getAll(params: GetPlansParams): Observable<any> {
    const p = new HttpParams()
      .set('PageNumber', params.pageNumber)
      .set('PageSize', params.pageSize);
    return this.api.get<any>(this.baseUrl, p);
  }

  getById(id: number): Observable<Plan> {
    return this.api.get<Plan>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreatePlanRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdatePlanRequest): Observable<void> {
    return this.api.put<void>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`${this.baseUrl}/${id}`);
  }

  show(id: number): Observable<void> {
    return this.api.put<void>(`${this.baseUrl}/${id}/show`, {});
  }

  hide(id: number): Observable<void> {
    return this.api.put<void>(`${this.baseUrl}/${id}/hide`, {});
  }

  recommend(id: number): Observable<void> {
    return this.api.put<void>(`${this.baseUrl}/${id}/recommend`, {});
  }

  unrecommend(id: number): Observable<void> {
    return this.api.put<void>(`${this.baseUrl}/${id}/unrecommend`, {});
  }
}
