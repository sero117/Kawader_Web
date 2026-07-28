export interface SubscriptionCategory {
  id: number;
  arabicName: string;
  englishName: string;
  durationDays: number;
  showCategory: boolean;
  locked: boolean;
  createdAt: string;
}

export interface CreateSubscriptionCategoryRequest {
  arabicName: string;
  englishName: string;
  durationDays: number;
  showCategory: boolean;
  idempotencyKey: string;
}

export interface UpdateSubscriptionCategoryRequest {
  arabicName: string;
  englishName: string;
  durationDays: number;
  showCategory: boolean;
}

export interface GetSubscriptionCategoriesParams {
  pageNumber: number;
  pageSize: number;
  showCategory?: boolean;
}
