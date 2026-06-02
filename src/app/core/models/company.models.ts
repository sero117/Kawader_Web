export enum CurrencyType {
  LYD = 0,
  USD = 1,
}

export enum CompanyType {
  Other      = 0,
  Technology = 1,
  Healthcare = 2,
}

export const CompanyTypeLabels: Record<CompanyType, string> = {
  [CompanyType.Other]:      'Other',
  [CompanyType.Technology]: 'Technology',
  [CompanyType.Healthcare]: 'Healthcare',
};

// ── Query params ─────────────────────────────────────────────────────────────

export interface GetCompaniesParams {
  pageSize?: number;
  pageNumber?: number;
  phoneNumber?: string;
  email?: string;
}

// ── Requests ────────────────────────────────────────────────────────────────

export interface CreateCompanyRequest {
  phoneNumber: string;
  email?: string;
  tenantId: string;
}

export interface UpdateCompanyRequest {
  phoneNumber?: string;
  email?: string;
}

// ── Response ─────────────────────────────────────────────────────────────────

export interface Company {
  id: number;
  phoneNumber: string;
  email?: string;
  tenantId: string;
  companyName?: string;
  address?: string;
  landlinePhone?: string;
  businessField?: string;
  companyType?: CompanyType;
  currency?: CurrencyType;
  utcOffset?: number;
  latitude?: number;
  longitude?: number;
  logoUrl?: string;
  isCompleted?: boolean;
  isActive?: boolean;
  createdAt?: string;
  createdBy?: number;
  completeAt?: string;
  isDeleted?: boolean;
  deletedBy?: number | null;
  deletedAt?: string | null;
  isFrozen?: boolean;
  frozenBy?: number | null;
  frozenAt?: string | null;
}

export interface CompanyStatus {
  id: number;
  companyName?: string;
  isActive: boolean;
}

export interface CompanySetupStatus {
  isCompleted: boolean;
  tenantId?: string;
  logoUrl?: string;
  companyName?: string;
}
