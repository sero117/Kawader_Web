export interface Plan {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  details: string[];
  showPlan: boolean;
  isRecommended: boolean;
  maxEmployees: number;
  maxSections: number;
  maxBranches: number;
}

export interface CreatePlanRequest {
  name: string;
  price: number;
  durationDays: number;
  details: string[];
  showPlan: boolean;
  isRecommended: boolean;
  maxEmployees: number;
  maxSections: number;
  maxBranches: number;
  idempotencyKey: string;
}

export interface UpdatePlanRequest {
  name: string;
  price: number;
  durationDays: number;
  details: string[];
  maxEmployees: number;
  maxSections: number;
  maxBranches: number;
}

export interface GetPlansParams {
  pageNumber: number;
  pageSize: number;
}
