// ── Enums ────────────────────────────────────────────────────────────────────

export enum Role {
  Employee       = 1,
  CompanyManager = 2,
  Admin          = 3,
}

export enum EmployeeType {
  Employee             = 0,
  HumanResourceManager = 1,
}

// ── Request models ──────────────────────────────────────────────────────────

export interface SignInRequest {
  phoneNumber: string;
  password: string;
}

export interface SignUpRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RefreshTokenRequest {
  userId: number;
  refreshToken: string;
}

export interface GenerateCodeRequest {
  phoneNumber: string;
}

export interface ConfirmCodeRequest {
  phoneNumber: string;
  code: string;
}

// ── Response models ─────────────────────────────────────────────────────────

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  userId?: number;
  role?: Role;
}

export interface ApiResponse<T = null> {
  isSuccess: boolean;
  message: string;
  data: T;
  errors?: string[];
}
