export interface Device {
  id: number;
  serialNumber: string;
  name: string;
  protocol: number;
  createdAt?: string;
}

export interface DeviceEmployee {
  id: number;
  employeeId: number;
  firstName: string;
  lastName: string;
  number: string;
}

export interface CreateDeviceRequest {
  serialNumber: string;
  name: string;
  protocol: number;
  idempotencyKey: string;
}

export interface UpdateDeviceRequest {
  name: string;
}

export interface AddDeviceEmployeeRequest {
  employeeId: number;
  number: string;
}

export interface UpdateDeviceEmployeeRequest {
  number: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
}
