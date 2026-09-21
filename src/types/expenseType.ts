import type { ExpenseCategory } from "./enums";

/** Backend `ExpenseTypeDto` / `Create|UpdateExpenseTypeRequest` ile birebir eşleşir. */
export interface ExpenseTypeDto {
  id: string;
  name: string;
  unit: string;
  category: ExpenseCategory;
  isActive: boolean;
}

export interface CreateExpenseTypeRequest {
  name: string;
  unit: string;
  category: ExpenseCategory;
}

export interface UpdateExpenseTypeRequest extends CreateExpenseTypeRequest {
  isActive: boolean;
}
