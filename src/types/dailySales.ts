import type { PaymentMethod, SalesChannel } from "./enums";

/** Backend `TaneHesap.Application.DailySales.DailySalesDtos` ile birebir eşleşir. */
export interface DailySalesEntryDto {
  id: string;
  saleDate: string;
  saleTime: string | null;
  dishSizeId: string;
  dishName: string;
  sizeName: string;
  quantity: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  channel: SalesChannel;
  platformId: string | null;
  platformName: string | null;
  discountAmount: number | null;
}

export interface ImportRowRequest {
  saleDate: string;
  saleTime: string | null;
  dishSizeId: string;
  quantity: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  channel: SalesChannel;
  platformId: string | null;
  discountAmount: number | null;
}

export interface ImportDailySalesRequest {
  fileName: string;
  rows: ImportRowRequest[];
}

export interface ImportDailySalesResult {
  importLogId: string;
  rowCount: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

export interface ExpectedIngredientConsumptionDto {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  expectedQuantity: number;
}

export interface ExpectedDaySummaryDto {
  date: string;
  expectedRevenue: number;
  expectedConsumption: ExpectedIngredientConsumptionDto[];
}
