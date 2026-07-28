export interface EmployeeLeaveBalance {
  id: number;
  employeeId: number;
  year: number;
  totalDays: number;
  usedDays: number;
  carriedOverDays: number;
  usedCarriedOverDays: number;
  remainingDays: number;
  createdAt: string;
}

export interface CreateLeaveBalanceRequest {
  year: number;
  totalDays: number;
}

export interface UpdateLeaveBalanceRequest {
  year: number;
  totalDays: number;
}

export interface CarryOverLeaveBalanceRequest {
  fromYear: number;
  toYear: number;
}
