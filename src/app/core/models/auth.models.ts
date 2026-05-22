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

export interface GenerateCodeResponse {
  id?: number;
  code?: string;
}

export interface CompleteCompanyInfoRequest {
  phoneNumber: string;
  code: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface ResetPasswordRequest {
  phoneNumber: string;
  code: string;
  password: string;
}

// ── Response models ─────────────────────────────────────────────────────────

export interface AuthTokenResponse {
  accessToken?: string;       // standard OAuth field
  token?: string;             // alias returned by this API
  refreshToken: string;
  expiresIn?: number;
  tokenExpiration?: string;
  tokenType?: string;
  userId?: number | string;
  role?: Role;
}

export interface ApiResponse<T = null> {
  isSuccess: boolean;
  message: string;
  data: T;
  errors?: string[];
}
