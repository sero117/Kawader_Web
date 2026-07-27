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
  countryId: number;
  idempotencyKey: string;
  agentId?: number | null;
}

export interface UpdateCompanyRequest {
  phoneNumber?: string;
  email?: string | null;
  countryId?: number;
  agentId?: number | null;
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
  countryId?: number | null;
  countryArabicName?: string | null;
  countryEnglishName?: string | null;
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
  agentId?: number | null;
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
  utcOffset?: number;
}
