import type { PaymentMethod } from "./enums";

/** Backend `EmployeeDto` / `Create|UpdateEmployeeRequest` ile birebir eşleşir. */
export interface EmployeeDto {
  id: string;
  username: string;
  fullName: string;
  isActive: boolean;
  hourlyWage: number;
}

export interface CreateEmployeeRequest {
  username: string;
  password: string;
  fullName: string;
  hourlyWage: number;
}

/** `password` null ise şifre değişmez. */
export interface UpdateEmployeeRequest {
  username: string | null;
  password: string | null;
  fullName: string | null;
  isActive: boolean;
  hourlyWage: number;
}

// --- Cüzdan (bkz. proje raporu 3.7): hak ediş = saat × saatlik ücret, ödeme = Personel kategorisinde gider ---

export interface EmployeeWorkLogDto {
  id: string;
  workDate: string;
  hours: number;
  hourlyWage: number;
  amount: number;
  note: string | null;
}

export interface CreateWorkLogRequest {
  workDate: string;
  hours: number;
  note: string | null;
}

export interface EmployeePaymentDto {
  expenseId: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod | null;
  paymentCardName: string | null;
  description: string | null;
}

export interface CreateEmployeePaymentRequest {
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  paymentCardId: string | null;
  note: string | null;
}

export interface EmployeeWalletDto {
  userId: string;
  fullName: string;
  hourlyWage: number;
  totalHours: number;
  totalEarned: number;
  totalPaid: number;
  /** İşletmenin çalışana borcu (hak ediş − ödenen). */
  balance: number;
  workLogs: EmployeeWorkLogDto[];
  payments: EmployeePaymentDto[];
}
