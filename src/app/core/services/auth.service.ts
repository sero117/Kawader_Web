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
  private readonly baseUrl = `${environment.apiUrl}/accounts`;

  signIn(payload: SignInRequest): Observable<ApiResponse<AuthTokenResponse>> {
    return this.http.post<ApiResponse<AuthTokenResponse>>(
      `${this.baseUrl}/SignIn`,
      payload
    );
  }

  signUp(payload: SignUpRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/SignUp`, payload);
  }

  refreshToken(
    payload: RefreshTokenRequest
  ): Observable<ApiResponse<AuthTokenResponse>> {
    return this.http.post<ApiResponse<AuthTokenResponse>>(
      `${this.baseUrl}/RefreshToken`,
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
      `${this.baseUrl}/ConfirmCode`,
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
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getDisplayName(): string {
    const token = this.getAccessToken();
    if (!token) return 'Admin';
    try {
      const claims = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
      const given  = claims['given_name']  as string | undefined;
      const family = claims['family_name'] as string | undefined;
      const name   = claims['name']        as string | undefined;
      if (given && family) return `${given} ${family}`;
      if (given)  return given;
      if (name)   return name;
    } catch { /* invalid token */ }
    return 'Admin';
  }
}
