/** Backend `TaneHesap.Application.DailyClosing.DailyClosingDtos` ile birebir eşleşir. */
export interface DailyActualConsumptionItemDto {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  actualQuantityUsed: number;
}

export interface DailyActualEntryDto {
  id: string;
  entryDate: string;
  actualRevenue: number;
  note: string | null;
  consumptionItems: DailyActualConsumptionItemDto[];
}

export interface SubmitDailyActualEntryRequest {
  entryDate: string;
  actualRevenue: number;
  note: string | null;
  consumptionItems: { ingredientId: string; actualQuantityUsed: number }[];
}

export interface DailyLossReportItemDto {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  expectedQuantity: number;
  actualQuantity: number;
  varianceQuantity: number;
  varianceCost: number;
}

export interface DailyLossReportDto {
  id: string;
  reportDate: string;
  expectedRevenue: number;
  actualRevenue: number;
  revenueVarianceAmount: number;
  generatedAtUtc: string;
  items: DailyLossReportItemDto[];
}
