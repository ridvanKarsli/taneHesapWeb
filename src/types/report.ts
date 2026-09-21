import type { ExpenseCategory } from "./enums";

/** Backend `PeriodReportDto` (TaneHesap.Application.Reports) ile birebir eşleşir. */
export interface PeriodReportDto {
  fromDate: string;
  toDate: string;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  inStoreRevenue: number;
  platformRevenue: number;
  totalExpense: number;
  netProfit: number;
  expenseByCategory: { category: ExpenseCategory; amount: number }[];
  revenueByPlatform: {
    platformId: string;
    platformName: string;
    grossRevenue: number;
    commissionAmount: number;
    netRevenue: number;
  }[];
}
