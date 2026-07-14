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

  /** Prefers the role saved from the sign-in response body — falls back to the
   *  JWT claim only for sessions that predate this storage (e.g. still in localStorage
   *  from before this field existed). */
  getStoredRole(): Role | null {
    const stored = localStorage.getItem(this.ROLE_KEY);
    if (stored !== null) return Number(stored) as Role;
    return this.getRoleFromToken();
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
        switch (this.getStoredEmployeeType()) {
          case EmployeeType.HumanResourceManager: return '/dashboard/hr';
          case EmployeeType.DepartmentManager:    return '/dashboard/dept';
          case EmployeeType.BranchManager:        return '/dashboard/branch';
          default:                                return '/dashboard/employee';
        }
      }
      default: return '/dashboard';
    }
  }

  saveEmployeeType(type: EmployeeType): void {
    localStorage.setItem(this.EMPLOYEE_TYPE_KEY, String(type));
  }

  getStoredEmployeeType(): EmployeeType {
    const stored = localStorage.getItem(this.EMPLOYEE_TYPE_KEY);
    if (stored !== null) return Number(stored) as EmployeeType;
    return this.getEmployeeTypeFromToken();
  }

  saveCompanyName(name: string): void {
    localStorage.setItem(this.COMPANY_NAME_KEY, name);
  }

  getStoredCompanyName(): string | null {
    return localStorage.getItem(this.COMPANY_NAME_KEY);
  }

  // ── Token management ────────────────────────────────────────────────────────

  private readonly ACCESS_TOKEN_KEY    = 'kawader_access_token';
  private readonly REFRESH_TOKEN_KEY   = 'kawader_refresh_token';
  private readonly USER_ID_KEY         = 'kawader_user_id';
  private readonly TENANT_ID_KEY       = 'kawader_tenant_id';
  private readonly LOGIN_PHONE_KEY     = 'kawader_login_phone';
  private readonly KNOWN_NAME_KEY      = 'kawader_known_name';
  private readonly ROLE_KEY            = 'kawader_role';
  private readonly EMPLOYEE_TYPE_KEY   = 'kawader_employee_type';
  private readonly COMPANY_NAME_KEY    = 'kawader_company_name';

  saveTokens(tokens: AuthTokenResponse): void {
    const access = tokens.accessToken ?? tokens.token;
    if (access) localStorage.setItem(this.ACCESS_TOKEN_KEY, access);
    if (tokens.refreshToken) localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    if (tokens.userId !== undefined) {
      localStorage.setItem(this.USER_ID_KEY, tokens.userId.toString());
    }
    // The sign-in response body's `role` is the proven-reliable source (it's what
    // getHomeRoute() already uses right after login) — the JWT's own role claim
    // shape has never actually been verified for CompanyManager, only Employee.
    if (tokens.role !== undefined) {
      localStorage.setItem(this.ROLE_KEY, String(tokens.role));
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

  /** The phone number used for the last successful sign-in — used to look up the account's own name. */
  setLoginPhone(phone: string): void {
    localStorage.setItem(this.LOGIN_PHONE_KEY, phone);
  }

  getLoginPhone(): string | null {
    return localStorage.getItem(this.LOGIN_PHONE_KEY);
  }

  /**
   * Cached at account-creation time (the only point we reliably have the
   * person's real name — the JWT carries no name claim and the accounts
   * lookup API is admin-only). Keyed by phone number so multiple accounts
   * signing in on the same browser don't bleed into each other.
   */
  setKnownName(phone: string, firstName: string, lastName: string): void {
    const name = `${firstName} ${lastName}`.trim();
    if (!phone || !name) return;
    const map = this.readKnownNames();
    map[phone] = name;
    localStorage.setItem(this.KNOWN_NAME_KEY, JSON.stringify(map));
  }

  getKnownName(): string | null {
    const phone = this.getLoginPhone();
    if (!phone) return null;
    return this.readKnownNames()[phone] ?? null;
  }

  private readKnownNames(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(this.KNOWN_NAME_KEY) ?? '{}'); }
    catch { return {}; }
  }

  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.TENANT_ID_KEY);
    localStorage.removeItem(this.LOGIN_PHONE_KEY);
    localStorage.removeItem(this.KNOWN_NAME_KEY);
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem(this.EMPLOYEE_TYPE_KEY);
    localStorage.removeItem(this.COMPANY_NAME_KEY);
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
    if (this.getStoredRole() !== Role.Employee) return false;
    return !this.getTenantIdFromToken() && !this.getSelectedTenantId();
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getDisplayName(): string {
    const known = this.getKnownName();
    if (known) return known;

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
