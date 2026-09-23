import type { PaymentMethod, RecurringPeriod } from "./enums";

/** Backend `RecurringExpenseDto` ve ilişkili istekler ile birebir eşleşir. */
export interface RecurringExpenseDto {
  id: string;
  name: string;
  amount: number;
  period: RecurringPeriod;
  startDate: string;
  isActive: boolean;
  currentPeriodStartDate: string;
  currentPeriodEndDate: string;
  isCurrentPeriodPaid: boolean;
}

export interface CreateRecurringExpenseRequest {
  name: string;
  amount: number;
  period: RecurringPeriod;
  startDate: string;
}

export interface UpdateRecurringExpenseRequest {
  name: string;
  amount: number;
  period: RecurringPeriod;
  isActive: boolean;
}

/** Ödeme, ödeme şekline göre kasadan/karttan düşen otomatik bir gider olarak da işlenir (bkz. proje raporu 3.8, 3.15). */
export interface MarkPeriodPaidRequest {
  periodStartDate: string;
  periodEndDate: string;
  paidAmount: number;
  paidDate: string;
  paymentMethod: PaymentMethod;
  paymentCardId: string | null;
}
