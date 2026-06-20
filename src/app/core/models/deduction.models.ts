export enum DeductionType {
  Late     = 0,
  Absence  = 1,
  Advance  = 2,
}

export interface Deduction {
  id: number;
  employeeId: number;
  deductionType: DeductionType;
  amount: number;
  date: string;
  reason?: string | null;
  createdAt: string;
}

export interface CreateDeductionRequest {
  deductionType: DeductionType;
  amount: number;
  date: string;
  reason?: string | null;
  idempotencyKey: string;
}

export interface UpdateDeductionRequest {
  deductionType: DeductionType;
  amount: number;
  date: string;
  reason?: string | null;
}

export interface GetDeductionsParams {
  pageNumber: number;
  pageSize: number;
  fromDate?: string;
  toDate?: string;
  type?: DeductionType | null;
}
