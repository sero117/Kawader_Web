export interface Agent {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string | null;
  countryId: number;
  countryArabicName?: string | null;
  countryEnglishName?: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface CreateAgentRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string | null;
  countryId: number;
  idempotencyKey: string;
}

export interface UpdateAgentRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string | null;
  countryId: number;
}

export interface GetAgentsParams {
  pageNumber: number;
  pageSize: number;
  name?: string;
}

export interface ReferredCompany {
  id: number;
  companyName: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface GetReferredCompaniesParams {
  pageNumber: number;
  pageSize: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
}
