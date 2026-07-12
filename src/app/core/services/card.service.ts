import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { Card, CreateCardRequest, GetCardsParams } from '../models/card.models';

@Injectable({ providedIn: 'root' })
export class CardService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/Cards`;

  getAll(params: GetCardsParams): Observable<any> {
    let p = new HttpParams()
      .set('PageNumber', params.pageNumber)
      .set('PageSize', params.pageSize);
    if (params.planId)       p = p.set('PlanId', params.planId);
    if (params.status != null) p = p.set('Status', params.status);
    if (params.serialNumber) p = p.set('SerialNumber', params.serialNumber);
    if (params.distinct)     p = p.set('Distinct', params.distinct);
    return this.api.get<any>(this.baseUrl, p);
  }

  getById(id: number): Observable<Card> {
    return this.api.get<Card>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateCardRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(this.baseUrl, payload);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`${this.baseUrl}/${id}`);
  }

  revoke(id: number): Observable<void> {
    return this.api.put<void>(`${this.baseUrl}/${id}/revoke`, {});
  }

  exportUrl(distinct?: string): string {
    let url = `${this.baseUrl}/export`;
    if (distinct) url += `?Distinct=${encodeURIComponent(distinct)}`;
    return url;
  }
}
