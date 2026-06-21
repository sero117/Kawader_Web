export interface EmployeeLeave {
  id: number;
  employeeId: number;
  startDate: string;
  endDate: string;
  isPaid: boolean;
  notes?: string | null;
  totalDays: number;
  leaveBalanceId?: number | null;
  createdAt: string;
}

export interface CreateEmployeeLeaveRequest {
  startDate: string;
  endDate: string;
  isPaid: boolean;
  notes?: string | null;
  idempotencyKey: string;
}

export interface UpdateEmployeeLeaveRequest {
  startDate: string;
  endDate: string;
  isPaid: boolean;
  notes?: string | null;
}

export interface GetEmployeeLeavesParams {
  pageNumber: number;
  pageSize: number;
  fromDate?: string;
  toDate?: string;
  isPaid?: boolean | null;
}
