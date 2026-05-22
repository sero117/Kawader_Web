import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SetupCompleteAccountPayload {
  phoneNumber: string;
  code: string;
  firstName: string;
  lastName: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class CompanySetupService {
  private readonly http        = inject(HttpClient);
  private readonly accountsUrl = `${environment.apiUrl}/accounts`;
  private readonly companiesUrl = `${environment.apiUrl}/Companies`;

  generateCode(phoneNumber: string): Observable<any> {
    return this.http.post<any>(`${this.accountsUrl}/generate-code`, { phoneNumber });
  }

  completeAccount(payload: SetupCompleteAccountPayload): Observable<any> {
    return this.http.post<any>(`${this.accountsUrl}/complete-company-info`, payload);
  }

  completeCompany(formData: FormData, managerToken: string): Observable<any> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${managerToken}` });
    return this.http.patch<any>(`${this.companiesUrl}/complete`, formData, { headers });
  }
}
