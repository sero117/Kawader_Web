import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { Account, GetAccountsParams } from '../models/account.models';
import { ApiResponse } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/Identity`;

  getAll(params: GetAccountsParams): Observable<ApiResponse<{ items: Account[]; totalCount: number; pageNumber: number; pageSize: number }>> {
    let p = new HttpParams()
      .set('PageNumber', params.pageNumber)
      .set('PageSize',   params.pageSize);
    if (params.phoneNumber) p = p.set('PhoneNumber', params.phoneNumber);
    if (params.firstName)   p = p.set('FirstName',   params.firstName);
    if (params.lastName)    p = p.set('LastName',    params.lastName);
    return this.api.get(this.baseUrl, p);
  }

  lock(id: number): Observable<{ id: number }> {
    return this.api.patch<{ id: number }>(`${this.baseUrl}/${id}/lock`, {});
  }

  unlock(id: number): Observable<{ id: number }> {
    return this.api.patch<{ id: number }>(`${this.baseUrl}/${id}/unlock`, {});
  }
}
