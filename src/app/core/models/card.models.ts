export enum CardStatus {
  Available = 1,
  Used      = 2,
  Revoked   = 3,
}

export interface Card {
  id: number;
  serialNumber: string;
  code: string;
  status: CardStatus;
  planId: number;
  planName: string;
  /** Copied from the plan's price at the moment this card was generated —
   *  frozen forever, independent of later changes to the plan's price. */
  price: number;
  distinct: string;
  createdAt: string;
  usedAt?: string | null;
  usedByCompanyName?: string | null;
}

export interface CreateCardRequest {
  planId: number;
  count: number;
  distinct: string;
  idempotencyKey: string;
}

export interface GetCardsParams {
  pageNumber: number;
  pageSize: number;
  planId?: number;
  status?: CardStatus;
  serialNumber?: string;
  distinct?: string;
}
