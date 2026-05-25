export interface Branch {
  id: number;
  name: string;
  code: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
}

export interface CreateBranchRequest {
  name: string;
  code: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  idempotencyKey: string;
}

export interface UpdateBranchRequest {
  name?: string;
  code?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface GetBranchesParams {
  pageNumber?: number;
  pageSize?: number;
  name?: string;
  code?: string;
}
