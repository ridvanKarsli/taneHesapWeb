import type { PaymentMethod } from "./enums";

/** Backend `ExpenseDto` / `CreateExpenseRequest` ile birebir eşleşir (tarihler `yyyy-MM-dd`). */
export interface ExpenseDto {
  id: string;
  expenseTypeId: string;
  expenseTypeName: string;
  amount: number;
  quantity: number | null;
  expenseDate: string;
  paymentMethod: PaymentMethod | null;
  description: string | null;
  createdByUserId: string | null;
  createdAtUtc: string;
}

export interface CreateExpenseRequest {
  expenseTypeId: string;
  amount: number;
  quantity: number | null;
  expenseDate: string;
  paymentMethod: PaymentMethod | null;
  description: string | null;
}

export interface ExpenseListFilter {
  fromDate?: string;
  toDate?: string;
  expenseTypeId?: string;
}
