import type { TreasuryAccount, TreasuryTransactionKind } from "./enums";

/** Backend `TaneHesap.Application.Treasury` DTO'ları ile birebir eşleşir (bkz. proje raporu 3.15). */
export interface PaymentCardDto {
  id: string;
  name: string;
  limit: number;
  usedAmount: number;
  availableLimit: number;
  isActive: boolean;
}

export interface CreatePaymentCardRequest {
  name: string;
  limit: number;
}

export interface UpdatePaymentCardRequest extends CreatePaymentCardRequest {
  isActive: boolean;
}

export interface TreasurySummaryDto {
  cashBalance: number;
  bankBalance: number;
  cardFeePercentage: number;
  cards: PaymentCardDto[];
}

export interface TreasuryTransactionDto {
  id: string;
  account: TreasuryAccount;
  paymentCardId: string | null;
  paymentCardName: string | null;
  amount: number;
  kind: TreasuryTransactionKind;
  transactionDate: string;
  description: string | null;
  sourceReferenceType: string | null;
  sourceReferenceId: string | null;
  createdAtUtc: string;
}

export interface TreasuryTransactionFilter {
  fromDate?: string;
  toDate?: string;
  account?: TreasuryAccount;
  paymentCardId?: string;
}

export interface TransferRequest {
  from: TreasuryAccount;
  to: TreasuryAccount;
  amount: number;
  date: string;
  note: string | null;
}

export interface CardPaymentRequest {
  paymentCardId: string;
  amount: number;
  date: string;
  source: TreasuryAccount;
  note: string | null;
}

export interface ManualAdjustmentRequest {
  account: TreasuryAccount;
  paymentCardId: string | null;
  amount: number;
  date: string;
  note: string | null;
}
