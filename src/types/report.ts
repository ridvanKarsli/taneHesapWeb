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
  /** Gün sonu kasa farkı (fazla +, açık −); kasaya yazıldığı için net kâra dahildir. */
  closingVariance: number;
  /** Gelir + kasa farkı − gider. */
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

/** Backend `IngredientEfficiencyDto` — tüketilen malzeme başına gelir ve önceki aya göre değişim. */
export interface IngredientEfficiencyDto {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  quantityUsed: number;
  revenuePerUnit: number;
  previousQuantityUsed: number;
  previousRevenuePerUnit: number;
  changePercent: number | null;
  isWarning: boolean;
}

/** Backend `MonthlyReportDto` — tabak başı genel maliyet + malzeme verimlilik uyarıları (bkz. proje raporu 3.16). */
export interface MonthlyReportDto {
  year: number;
  month: number;
  totalRevenue: number;
  totalExpense: number;
  /** Gün sonu kasa farkı (fazla +, açık −); kasaya yazıldığı için net kâra dahildir. */
  closingVariance: number;
  /** Gelir + kasa farkı − gider. */
  netProfit: number;
  platesSold: number;
  costPerPlate: number;
  revenuePerPlate: number;
  previousCostPerPlate: number;
  ingredients: IngredientEfficiencyDto[];
  warnings: string[];
  closedAtUtc: string | null;
  /** false: ay henüz bitmedi — genel maliyet ay sonunda hesaplanır. */
  isFinal: boolean;
}
