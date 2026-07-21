export enum Country {
  Libya = 1,
  Syria = 2,
  Iraq  = 3,
}

export interface Agent {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string | null;
  country: Country;
  isVerified: boolean;
  createdAt: string;
}

export interface CreateAgentRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string | null;
  country: Country;
  idempotencyKey: string;
}

export interface UpdateAgentRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string | null;
  country: Country;
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
