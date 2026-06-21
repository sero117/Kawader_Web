export enum HolidayRecurrence {
  None   = 0,
  Yearly = 1,
}

export interface CompanyHoliday {
  id: number;
  name: string;
  date: string;
  holidayRecurrence: HolidayRecurrence;
  isPaid: boolean;
  createdAt: string;
}

export interface CreateCompanyHolidayRequest {
  name: string;
  date: string;
  holidayRecurrence: HolidayRecurrence;
  isPaid: boolean;
  idempotencyKey: string;
}

export interface UpdateCompanyHolidayRequest {
  name: string;
  date: string;
  holidayRecurrence: HolidayRecurrence;
  isPaid: boolean;
}

export interface GetCompanyHolidaysParams {
  pageNumber: number;
  pageSize: number;
  name?: string;
  year?: number;
}
