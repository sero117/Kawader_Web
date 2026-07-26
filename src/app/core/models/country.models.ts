export interface Country {
  id: number;
  arabicName: string;
  englishName: string;
  locked: boolean;
  createdAt: string;
}

export interface CreateCountryRequest {
  arabicName: string;
  englishName: string;
  idempotencyKey: string;
}

export interface UpdateCountryRequest {
  arabicName: string;
  englishName: string;
}

export interface GetCountriesParams {
  pageNumber: number;
  pageSize: number;
  name?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
}
