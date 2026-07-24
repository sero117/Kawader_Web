import { Injectable, inject } from '@angular/core';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import {
  Agent,
  CreateAgentRequest,
  UpdateAgentRequest,
  GetAgentsParams,
  ReferredCompany,
  GetReferredCompaniesParams,
  PagedResult,
} from '../models/agent.models';

const SILENT_HEADERS = new HttpHeaders().set('X-Silent', 'true');

@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/Agents`;

  create(payload: CreateAgentRequest): Observable<{ id: number }> {
    return this.api.post<{ id: number }>(this.baseUrl, payload);
  }

  /** @param silent Suppresses the global error toast — use for background fetches
   *  (e.g. populating a dropdown) where a failure shouldn't interrupt the user. */
  getAll(params: GetAgentsParams, silent = false): Observable<PagedResult<Agent>> {
    let p = new HttpParams()
      .set('PageNumber', params.pageNumber)
      .set('PageSize',   params.pageSize);
    if (params.name) p = p.set('Name', params.name);
    return this.api.get<PagedResult<Agent>>(this.baseUrl, p, silent ? SILENT_HEADERS : undefined);
  }

  getById(id: number): Observable<Agent> {
    return this.api.get<Agent>(`${this.baseUrl}/${id}`);
  }

  update(id: number, payload: UpdateAgentRequest): Observable<{ id: number }> {
    return this.api.put<{ id: number }>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<{ id: number }> {
    return this.api.delete<{ id: number }>(`${this.baseUrl}/${id}`);
  }

  /** Agent self-service — companies referred by the currently authenticated agent. */
  getMyCompanies(params: GetReferredCompaniesParams): Observable<PagedResult<ReferredCompany>> {
    const p = new HttpParams()
      .set('PageNumber', params.pageNumber)
      .set('PageSize',   params.pageSize);
    return this.api.get<PagedResult<ReferredCompany>>(`${this.baseUrl}/me/companies`, p);
  }
}
