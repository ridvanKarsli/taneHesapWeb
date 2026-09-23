import type { ExpenseCategory, PaymentMethod } from "./enums";

/** Backend `ExpenseDto` / `CreateExpenseRequest` ile birebir eşleşir (tarihler `yyyy-MM-dd`). */
export interface ExpenseDto {
  id: string;
  expenseTypeId: string;
  expenseTypeName: string;
  expenseCategory: ExpenseCategory;
  amount: number;
  quantity: number | null;
  expenseDate: string;
  paymentMethod: PaymentMethod | null;
  /** Ödeme şekli kredi kartı ise hangi kart (limitten düşer). */
  paymentCardId: string | null;
  paymentCardName: string | null;
  /** Personel kategorisinde ödemenin yapıldığı çalışan (cüzdanından düşer). */
  employeeUserId: string | null;
  employeeName: string | null;
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
  paymentCardId: string | null;
  employeeUserId: string | null;
  description: string | null;
}

export interface ExpenseListFilter {
  fromDate?: string;
  toDate?: string;
  expenseTypeId?: string;
}
