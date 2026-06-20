export enum IncentiveType {
  Performance = 0,
  Bonus       = 1,
}

export interface Incentive {
  id: number;
  employeeId: number;
  incentiveType: IncentiveType;
  amount: number;
  date: string;
  reason?: string | null;
  createdAt: string;
}

export interface CreateIncentiveRequest {
  incentiveType: IncentiveType;
  amount: number;
  date: string;
  reason?: string | null;
  idempotencyKey: string;
}

export interface UpdateIncentiveRequest {
  incentiveType: IncentiveType;
  amount: number;
  date: string;
  reason?: string | null;
}

export interface GetIncentivesParams {
  pageNumber: number;
  pageSize: number;
  fromDate?: string;
  toDate?: string;
  type?: IncentiveType | null;
}
