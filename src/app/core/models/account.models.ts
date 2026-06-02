export interface Account {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  role: string;
  isLocked: boolean;
}

export interface GetAccountsParams {
  pageNumber: number;
  pageSize: number;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
}
