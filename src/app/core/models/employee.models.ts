import { EmployeeType } from './auth.models';
export { EmployeeType };

export enum EmployeeStatus {
  Probation   = 0,
  Active      = 1,
  Suspended   = 3,
  Resigned    = 4,
  Terminated  = 5,
}

export enum GenderType {
  Male   = 0,
  Female = 1,
}

export enum ContractType {
  FullTime   = 0,
  PartTime   = 1,
  Temporary  = 2,
  Contractor = 3,
  Other      = 4,
}

export enum RelationType {
  Father        = 0,
  Mother        = 1,
  Brother       = 2,
  Sister        = 3,
  Husband       = 4,
  Wife          = 5,
  Son           = 6,
  Daughter      = 7,
  CloseRelative = 8,
  Other         = 9,
}

export enum AttachmentType {
  IdentityPhoto       = 0,
  PersonalPhoto       = 1,
  WorkContract        = 2,
  Certificate         = 3,
  Qualifications      = 4,
  HealthCard          = 5,
  ProfessionalLicense = 6,
}

export interface Employee {
  id: number;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeRole: EmployeeType;
  isVerified?: boolean;
  createdAt?: string;
  // List response fields
  employeeNumber?: string;
  jobTitle?: string;
  contractType?: ContractType;
  // Detail response fields
  birthDate?: string;
  gender?: GenderType;
  nationality?: string;
  branchId?: number;
  sectionId?: number;
  hireDate?: string;
  baseSalary?: number;
  lastSalaryModifiedAt?: string;
  workStartTime?: string;
  workEndTime?: string;
  internalNotes?: string;
  status?: EmployeeStatus;
}

export interface CreateEmployeeRequest {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeRole: EmployeeType;
  birthDate: string;
  gender: GenderType;
  nationality?: string;
  employeeNumber: string;
  jobTitle: string;
  branchId?: number;
  sectionId?: number;
  hireDate: string;
  contractType: ContractType;
  baseSalary: number;
  internalNotes?: string;
}

export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  employeeRole?: EmployeeType;
  birthDate?: string;
  gender?: GenderType;
  nationality?: string;
  employeeNumber?: string;
  jobTitle?: string;
  branchId?: number;
  sectionId?: number;
  hireDate?: string;
  contractType?: ContractType;
  baseSalary?: number;
  internalNotes?: string;
}

export interface GetEmployeesParams {
  pageNumber?: number;
  pageSize?: number;
  tenantId?: string;
  phoneNumber?: string;
  branchId?: number;
  sectionId?: number;
}

// ── Active employees (for payroll/employee pickers) ─────────────────────────────

export interface ActiveEmployee {
  id: number;
  fullName: string;
  phoneNumber: string;
}

// ── My Companies (multi-tenant employee context) ────────────────────────────────

export interface EmployeeCompany {
  companyName: string;
  companyId: number;
  tenantId: string;
}

// ── Status History ────────────────────────────────────────────────────────────

export interface EmployeeStatusHistory {
  id: number;
  status: EmployeeStatus;
  startDate: string;
  endDate?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface CreateStatusHistoryRequest {
  status: EmployeeStatus;
  startDate: string;
  endDate?: string | null;
  reason?: string | null;
}

export interface UpdateStatusHistoryRequest {
  status: EmployeeStatus;
  startDate: string;
  endDate?: string | null;
  reason?: string | null;
}

export interface GetStatusHistoryParams {
  pageNumber: number;
  pageSize: number;
  status?: EmployeeStatus;
}

// ── Emergency Contacts ────────────────────────────────────────────────────────

export interface EmergencyContact {
  id: number;
  name: string;
  phone: string;
  relation: RelationType;
  priority: number;
}

export interface CreateEmergencyContactRequest {
  name: string;
  phone: string;
  relation: RelationType;
  priority: number;
}

export interface UpdateEmergencyContactRequest {
  name: string;
  phone: string;
  relation: RelationType;
  priority: number;
}
