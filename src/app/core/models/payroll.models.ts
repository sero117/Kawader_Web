export type PayrollStatus = 'Draft' | 'Approved' | 'Paid';

export type ProcessingStatus = 'Idle' | 'Processing' | 'Completed' | 'Failed';

export interface PayrollRun {
  id: number;
  periodStart: string;
  periodEnd: string;
  status: PayrollStatus;
  processingStatus: ProcessingStatus;
  processingError?: string | null;
  payslipCount: number;
  createdAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

export interface Payslip {
  id: number;
  employeeId: number;
  employeeName: string;
  baseSalary: number;
  totalExpectedHours: number;
  totalActualHours: number;
  hourlyRate: number;
  shortageHours: number;
  shortageDeduction: number;
  overtimeHours: number;
  overtimeRate: number;
  overtimeAmount: number;
  totalIncentives: number;
  totalDeductions: number;
  netSalary: number;
  isManuallyAdjusted: boolean;
  adjustmentNotes?: string | null;
}

export interface PayrollRunDetail {
  id: number;
  periodStart: string;
  periodEnd: string;
  status: PayrollStatus;
  processingStatus: ProcessingStatus;
  processingError?: string | null;
  createdAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  payslips: Payslip[];
}

export interface CreatePayrollRequest {
  periodStart: string;
  periodEnd: string;
  idempotencyKey: string;
}

export interface UpdatePayrollRequest {
  periodStart: string;
  periodEnd: string;
}

export interface AddPayslipsRequest {
  employeeIds: number[];
}

export interface UpdatePayslipRequest {
  netSalary: number;
  adjustmentNotes?: string | null;
}

export interface GetPayrollsParams {
  pageNumber: number;
  pageSize: number;
  status?: PayrollStatus | null;
}

export interface GetPayrollDetailParams {
  employeeName?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
}
