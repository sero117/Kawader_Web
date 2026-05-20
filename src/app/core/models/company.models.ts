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
  tenantId?: string;
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
  logoUrl?: string;
  isCompleted?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

export interface CompanyStatus {
  id: number;
  companyName?: string;
  isActive: boolean;
}
