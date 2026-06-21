import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SignInRequest,
  SignUpRequest,
  RefreshTokenRequest,
  GenerateCodeRequest,
  ConfirmCodeRequest,
  GenerateCodeResponse,
  CompleteCompanyInfoRequest,
  ResetPasswordRequest,
  AuthTokenResponse,
  ApiResponse,
  Role,
  EmployeeType,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Identity`;

  signIn(payload: SignInRequest): Observable<ApiResponse<AuthTokenResponse>> {
    return this.http.post<ApiResponse<AuthTokenResponse>>(
      `${this.baseUrl}/signin`,
      payload
    );
  }

  signUp(payload: SignUpRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/signup`, payload);
  }

  refreshToken(
    payload: RefreshTokenRequest
  ): Observable<ApiResponse<AuthTokenResponse>> {
    return this.http.post<ApiResponse<AuthTokenResponse>>(
      `${this.baseUrl}/refresh-token`,
      payload
    );
  }

  generateCode(payload: GenerateCodeRequest): Observable<ApiResponse<GenerateCodeResponse>> {
    return this.http.post<ApiResponse<GenerateCodeResponse>>(
      `${this.baseUrl}/generate-code`,
      payload
    );
  }

  confirmCode(payload: ConfirmCodeRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/confirm-code`,
      payload
    );
  }

  completeCompanyInfo(
    payload: CompleteCompanyInfoRequest
  ): Observable<ApiResponse<AuthTokenResponse>> {
    return this.http.post<ApiResponse<AuthTokenResponse>>(
      `${this.baseUrl}/complete-company-info`,
      payload
    );
  }

  resetPassword(payload: ResetPasswordRequest): Observable<ApiResponse<AuthTokenResponse>> {
    return this.http.post<ApiResponse<AuthTokenResponse>>(
      `${this.baseUrl}/reset-password`,
      payload
    );
  }

  getEmployeeTypeFromToken(): EmployeeType {
    const token = this.getAccessToken();
    if (!token) return EmployeeType.Employee;
    try {
      const claims = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
      const et = claims['EmployeeType'] ?? claims['employeeType'] ?? claims['employee_type'];
      if (et !== undefined) return Number(et) as EmployeeType;
    } catch { /* invalid token */ }
    return EmployeeType.Employee;
  }

  getRoleFromToken(): Role | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const claims = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
      const roleVal = claims['role'] ??
        claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      if (roleVal !== undefined) return Number(roleVal) as Role;
    } catch { /* invalid token */ }
    return null;
  }

  getHomeRoute(role: Role | number | undefined): string {
    switch (Number(role)) {
      case Role.Admin:          return '/dashboard/admin';
      case Role.CompanyManager: return '/dashboard/manager';
      case Role.Employee: {
        switch (this.getEmployeeTypeFromToken()) {
          case EmployeeType.HumanResourceManager: return '/dashboard/hr';
          case EmployeeType.DepartmentManager:    return '/dashboard/dept';
          case EmployeeType.BranchManager:        return '/dashboard/branch';
          default:                                return '/dashboard/employee';
        }
      }
      default: return '/dashboard';
    }
  }

  // ── Token management ────────────────────────────────────────────────────────

  private readonly ACCESS_TOKEN_KEY = 'kawader_access_token';
  private readonly REFRESH_TOKEN_KEY = 'kawader_refresh_token';
  private readonly USER_ID_KEY = 'kawader_user_id';
  private readonly TENANT_ID_KEY = 'kawader_tenant_id';

  saveTokens(tokens: AuthTokenResponse): void {
    const access = tokens.accessToken ?? tokens.token;
    if (access) localStorage.setItem(this.ACCESS_TOKEN_KEY, access);
    if (tokens.refreshToken) localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    if (tokens.userId !== undefined) {
      localStorage.setItem(this.USER_ID_KEY, tokens.userId.toString());
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getUserId(): number | null {
    const id = localStorage.getItem(this.USER_ID_KEY);
    return id ? parseInt(id, 10) : null;
  }

  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.TENANT_ID_KEY);
  }

  // ── Tenant resolution (multi-company employees) ─────────────────────────────

  /** Reads the `tenantId` claim embedded in the JWT, if any. */
  getTenantIdFromToken(): string | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const claims = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
      const tid = claims['tenantId'] ?? claims['TenantId'] ?? claims['tenant_id'];
      return typeof tid === 'string' && tid ? tid : null;
    } catch { /* invalid token */ }
    return null;
  }

  getSelectedTenantId(): string | null {
    return localStorage.getItem(this.TENANT_ID_KEY);
  }

  setSelectedTenantId(tenantId: string): void {
    localStorage.setItem(this.TENANT_ID_KEY, tenantId);
  }

  /** The header to send with API requests: token claim takes priority, then the manually selected company. */
  getEffectiveTenantId(): string | null {
    return this.getTenantIdFromToken() ?? this.getSelectedTenantId();
  }

  /** True when the employee's token has no tenant pinned and they haven't picked a company yet. */
  needsCompanySelection(): boolean {
    if (this.getRoleFromToken() !== Role.Employee) return false;
    return !this.getTenantIdFromToken() && !this.getSelectedTenantId();
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getDisplayName(): string {
    const token = this.getAccessToken();
    if (!token) return 'User';
    try {
      const claims = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
      const str = (...keys: string[]): string | undefined => {
        for (const k of keys) {
          const v = claims[k];
          if (typeof v === 'string' && v.trim()) return v.trim();
        }
        return undefined;
      };

      const given = str(
        'given_name', 'GivenName',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      );
      const family = str(
        'family_name', 'FamilyName', 'Surname',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
      );
      const name = str(
        'name', 'Name', 'unique_name', 'FullName',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
      );
      const phone = str(
        'phoneNumber', 'PhoneNumber', 'phone_number',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/mobilephone',
      );

      if (given && family) return `${given} ${family}`;
      if (given)  return given;
      if (name)   return name;
      if (phone)  return phone;
    } catch { /* invalid token */ }

    switch (this.getRoleFromToken()) {
      case Role.Admin:          return 'Admin';
      case Role.CompanyManager: return 'Manager';
      case Role.Employee:       return 'Employee';
      default:                  return 'User';
    }
  }
}
