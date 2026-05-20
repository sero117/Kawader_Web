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
  AuthTokenResponse,
  ApiResponse,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}`;

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

  generateCode(payload: GenerateCodeRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/GenerateCode`,
      payload
    );
  }

  confirmCode(payload: ConfirmCodeRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/ConfirmCode`,
      payload
    );
  }

  // ── Token management ────────────────────────────────────────────────────────

  private readonly ACCESS_TOKEN_KEY = 'kawader_access_token';
  private readonly REFRESH_TOKEN_KEY = 'kawader_refresh_token';
  private readonly USER_ID_KEY = 'kawader_user_id';

  saveTokens(tokens: AuthTokenResponse): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
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
}
