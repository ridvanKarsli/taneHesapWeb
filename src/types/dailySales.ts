import type { PaymentMethod, SalesChannel } from "./enums";

/** Backend `TaneHesap.Application.DailySales.DailySalesDtos` ile birebir eşleşir. */
export interface DailySalesEntryDto {
  id: string;
  saleDate: string;
  saleTime: string | null;
  dishSizeId: string | null;
  dishName: string;
  sizeName: string;
  quantity: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  channel: SalesChannel;
  platformId: string | null;
  platformName: string | null;
  discountAmount: number | null;
  externalOrderNumber: string | null;
}

/** Backend `DailySalesUploadDto`: bir günün bir kaynaktan yüklenmiş satış özeti ("Geçmiş yüklemeler"). */
export interface DailySalesUploadDto {
  date: string;
  channel: SalesChannel;
  platformId: string | null;
  rowCount: number;
  totalAmount: number;
  lastUploadedAtUtc: string;
}

export interface ImportRowRequest {
  saleDate: string;
  saleTime: string | null;
  /** Sistemde eşleşen ürün boyu; eşleşmeyen platform ürünü için null (gelir sayılır, stoktan düşmez). */
  dishSizeId: string | null;
  /** Dosyadaki ürün adı. */
  productName: string | null;
  /** Platformun sipariş numarası (Trendyol Go / Yemeksepeti). */
  externalOrderNumber: string | null;
  quantity: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  channel: SalesChannel;
  platformId: string | null;
  discountAmount: number | null;
}

/** Aynı güne ikinci kez satış gelirse ne yapılacağı (backend `DailySalesImportMode`). */
export const DailySalesImportMode = {
  /** Elle tek tek giriş: var olanların üzerine eklenir. */
  Append: 0,
  /** Dosya: o günlerde kayıt varsa 409 — aynı dosya iki kez yüklenip gün iki kez sayılmaz. */
  RejectIfExists: 1,
  /** Dosya: o günlerin kayıtları silinip yeniden yazılır. */
  Replace: 2,
} as const;
export type DailySalesImportMode = (typeof DailySalesImportMode)[keyof typeof DailySalesImportMode];

export interface ImportDailySalesRequest {
  fileName: string;
  rows: ImportRowRequest[];
  mode: DailySalesImportMode;
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
