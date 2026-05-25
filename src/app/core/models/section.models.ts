export interface Section {
  id: number;
  branchId: number;
  name: string;
  code: string;
  createdAt?: string;
}

export interface CreateSectionRequest {
  branchId: number;
  name: string;
  code: string;
  idempotencyKey: string;
}

export interface UpdateSectionRequest {
  name?: string;
  code?: string;
}

export interface GetSectionsParams {
  pageNumber?: number;
  pageSize?: number;
  branchId?: number;
  name?: string;
  code?: string;
}
