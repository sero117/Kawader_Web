export enum SubscriptionStatus {
  Active  = 1,
  Expired = 2,
  Pending = 3,
}

export interface Subscription {
  id: number;
  planId: number;
  planName: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  companyName?: string;
  maxEmployees: number;
  maxSections: number;
  maxBranches: number;
}

export interface RedeemCardRequest {
  serialNumber: string;
  code: string;
}

export interface GetSubscriptionsParams {
  pageNumber: number;
  pageSize: number;
  planId?: number;
  status?: SubscriptionStatus;
}
