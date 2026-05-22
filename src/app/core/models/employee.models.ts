import { EmployeeType } from './auth.models';
export { EmployeeType };

export interface Employee {
  id: number;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeType: EmployeeType;
  createdAt?: string;
}

export interface CreateEmployeeRequest {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeType: EmployeeType;
}

export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  employeeType?: EmployeeType;
}

export interface GetEmployeesParams {
  pageNumber?: number;
  pageSize?: number;
  tenantId?: string;
  phoneNumber?: string;
}
