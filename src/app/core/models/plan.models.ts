export type PlanCurrency = 'USD' | 'LYD';

export interface Plan {
  id: number;
  name: string;
  price: number;
  currency: PlanCurrency;
  subscriptionCategoryId: number;
  subscriptionCategoryArabicName: string;
  subscriptionCategoryEnglishName: string;
  /** Still present with the same meaning — now sourced from the linked
   *  subscription category rather than stored on the plan itself. */
  durationDays: number;
  details: string[];
  showPlan: boolean;
  isRecommended: boolean;
  maxEmployees: number;
  maxSections: number;
  maxBranches: number;
  /** True once cards have been generated for this plan — locks
   *  subscriptionCategoryId/maxEmployees/maxSections/maxBranches; price/name/details stay editable. */
  locked: boolean;
}

export interface CreatePlanRequest {
  name: string;
  price: number;
  currency: PlanCurrency;
  subscriptionCategoryId: number;
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
  currency: PlanCurrency;
  subscriptionCategoryId: number;
  details: string[];
  maxEmployees: number;
  maxSections: number;
  maxBranches: number;
}

export interface GetPlansParams {
  pageNumber: number;
  pageSize: number;
  subscriptionCategoryId?: number;
}
