export interface Currency {
  id: number;
  arabicName: string;
  englishName: string;
  code: string;
  symbol: string;
  rate: number;
  locked: boolean;
  createdAt: string;
}

/** Returned by GET /currencies/me and GET /companies/{id}/currencies — carries the
 *  company's own display order, ascending. */
export interface CompanyCurrency extends Currency {
  priority: number;
}

export interface CreateCurrencyRequest {
  arabicName: string;
  englishName: string;
  code: string;
  symbol: string;
  rate: number;
  idempotencyKey: string;
}

export interface UpdateCurrencyRequest {
  arabicName: string;
  englishName: string;
  code: string;
  symbol: string;
  rate: number;
}

export interface GetCurrenciesParams {
  pageNumber: number;
  pageSize: number;
  code?: string;
  name?: string;
}

export interface CurrencyRate {
  id: number;
  rate: number;
  effectiveFrom: string;
  createdBy: number;
}

export interface GetCurrencyRatesParams {
  pageNumber: number;
  pageSize: number;
}

export interface GrantCompanyCurrencyRequest {
  currencyId: number;
  priority: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
}
