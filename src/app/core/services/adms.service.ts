import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';

export interface AdmsLog {
  id?: number;
  employeeId?: number;
  employeeName?: string;
  deviceEmployeeNumber?: string;
  number?: string;
  punchTime?: string;
  timestamp?: string;
  time?: string;
  deviceSerial?: string;
  serialNumber?: string;
  deviceName?: string;
  verifyType?: number | string;
  status?: number | string;
  workCode?: string;
}

@Injectable({ providedIn: 'root' })
export class AdmsService {
  private readonly api     = inject(ApiService);
  private readonly baseUrl = `${environment.apiUrl}/Adms`;

  getLogs(): Observable<any> {
    return this.api.get<any>(`${this.baseUrl}/logs`);
  }
}
