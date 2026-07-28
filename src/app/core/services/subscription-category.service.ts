import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import {
  SubscriptionCategory, CreateSubscriptionCategoryRequest, UpdateSubscriptionCategoryRequest,
  GetSubscriptionCategoriesParams,
} from '../models/subscription-category.models';
import { PagedResult } from '../models/country.models';

@Injectable({ providedIn: 'root' })
export class SubscriptionCategoryService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/subscription-categories`;

  getAll(params: GetSubscriptionCategoriesParams): Observable<PagedResult<SubscriptionCategory>> {
    let p = new HttpParams()
      .set('PageNumber', params.pageNumber)
      .set('PageSize',   params.pageSize);
    if (params.showCategory !== undefined) p = p.set('ShowCategory', params.showCategory);
    return this.api.get<PagedResult<SubscriptionCategory>>(this.baseUrl, p);
  }

  getById(id: number): Observable<SubscriptionCategory> {
    return this.api.get<SubscriptionCategory>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateSubscriptionCategoryRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateSubscriptionCategoryRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.baseUrl}/${id}`);
  }
}
