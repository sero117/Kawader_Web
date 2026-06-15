export enum ShiftType {
  Regular  = 0,
  Overtime = 1,
}

export enum DayOfWeek {
  Sunday    = 0,
  Monday    = 1,
  Tuesday   = 2,
  Wednesday = 3,
  Thursday  = 4,
  Friday    = 5,
  Saturday  = 6,
}

export enum AttendanceStatus {
  Present    = 0,
  Absent     = 1,
  Late       = 2,
  EarlyLeave = 3,
}

// ── Shifts ────────────────────────────────────────────────────────────────────

export interface Shift {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  type: ShiftType;
  createdAt?: string;
}

export interface CreateShiftRequest {
  name: string;
  startTime: string;
  endTime: string;
  type: ShiftType;
  idempotencyKey: string;
}

export interface UpdateShiftRequest {
  name?: string;
  startTime?: string;
  endTime?: string;
  type?: ShiftType;
}

export interface GetShiftsParams {
  pageNumber?: number;
  pageSize?: number;
  name?: string;
  type?: ShiftType | null;
}

// ── Shift Systems ─────────────────────────────────────────────────────────────

export interface ShiftSystem {
  id: number;
  name: string;
  createdAt?: string;
}

export interface CreateShiftSystemRequest {
  name: string;
  idempotencyKey: string;
}

export interface UpdateShiftSystemRequest {
  name: string;
}

export interface GetShiftSystemsParams {
  pageNumber?: number;
  pageSize?: number;
  name?: string;
}

// ── Shift System Days ─────────────────────────────────────────────────────────

export interface ShiftSystemDay {
  id: number;
  dayOfWeek: DayOfWeek;
  shiftId: number;
  shiftName: string;
  startTime: string;
  endTime: string;
}

export interface CreateShiftSystemDayRequest {
  shiftId: number;
  dayOfWeek: DayOfWeek;
  idempotencyKey: string;
}

export interface UpdateShiftSystemDayRequest {
  shiftId: number;
  dayOfWeek: DayOfWeek;
}

// ── Employee Shift Assignment ──────────────────────────────────────────────────

export interface EmployeeShiftSystem {
  shiftSystemId: number;
  shiftSystemName: string;
  days: ShiftSystemDay[];
}

export interface AssignShiftSystemRequest {
  shiftSystemId: number;
  idempotencyKey: string;
}

// ── Shift Logs ────────────────────────────────────────────────────────────────

export interface ShiftLog {
  id: number;
  employeeId: number;
  employeeFirstName?: string;
  employeeLastName?: string;
  shiftId: number;
  shiftName: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string | null;
  status: AttendanceStatus;
  notes?: string | null;
  createdAt: string;
}

export interface CreateShiftLogRequest {
  shiftId: number;
  date: string;
  checkInTime: string;
  notes?: string | null;
  idempotencyKey: string;
}

export interface UpdateShiftLogRequest {
  checkOutTime?: string | null;
  status: AttendanceStatus;
  notes?: string | null;
}

export interface GetShiftLogsParams {
  pageNumber: number;
  pageSize: number;
  employeeId?: number | null;
  shiftSystemId?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
}
