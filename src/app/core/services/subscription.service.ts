import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { Subscription, RedeemCardRequest, GetSubscriptionsParams } from '../models/subscription.models';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/Subscriptions`;

  getAll(params: GetSubscriptionsParams): Observable<any> {
    let p = new HttpParams()
      .set('PageNumber', params.pageNumber)
      .set('PageSize', params.pageSize);
    if (params.planId) p = p.set('PlanId', params.planId);
    if (params.status != null) p = p.set('Status', params.status);
    return this.api.get<any>(this.baseUrl, p);
  }

  getMy(): Observable<Subscription> {
    return this.api.get<Subscription>(`${this.baseUrl}/me`);
  }

  redeem(payload: RedeemCardRequest): Observable<void> {
    return this.api.post<void>(`${this.baseUrl}/redeem`, payload);
  }
}
