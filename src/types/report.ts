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
  /** Tabak (boy) bazlı satış; maliyet güncel malzeme fiyatlarıyla tahminidir. */
  salesByDish: {
    dishSizeId: string;
    dishName: string;
    sizeName: string;
    quantity: number;
    revenue: number;
    estimatedCost: number;
    estimatedProfit: number;
  }[];
  revenueByPlatform: {
    platformId: string;
    platformName: string;
    grossRevenue: number;
    commissionAmount: number;
    netRevenue: number;
  }[];
}
