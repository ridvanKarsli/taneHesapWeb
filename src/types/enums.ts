/**
 * Backend `TaneHesap.Domain.Enums` ile birebir aynı sayısal değerler (System.Text.Json enum'ları
 * sayı olarak serileştirir). `erasableSyntaxOnly` gerçek TS enum'una izin vermediği için
 * `UserRole` (bkz. `auth.ts`) ile aynı `as const` + etiket haritası deseni kullanılır.
 */

export const PaymentMethod = { Cash: 0, Card: 1 } as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: "Nakit",
  [PaymentMethod.Card]: "Kart",
};

export const ExpenseCategory = { Material: 0, FixedExpense: 1, Other: 2 } as const;
export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.Material]: "Malzeme",
  [ExpenseCategory.FixedExpense]: "Sabit gider",
  [ExpenseCategory.Other]: "Diğer",
};

export const StockMovementType = { Purchase: 0, SaleConsumption: 1, ManualAdjustment: 2, Waste: 3 } as const;
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];
export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  [StockMovementType.Purchase]: "Alış",
  [StockMovementType.SaleConsumption]: "Satış tüketimi",
  [StockMovementType.ManualAdjustment]: "Sayım düzeltmesi",
  [StockMovementType.Waste]: "Fire",
};

export const SalesChannel = { InStore: 0, Platform: 1 } as const;
export type SalesChannel = (typeof SalesChannel)[keyof typeof SalesChannel];
export const SALES_CHANNEL_LABELS: Record<SalesChannel, string> = {
  [SalesChannel.InStore]: "Dükkan içi",
  [SalesChannel.Platform]: "Paket servis",
};

export const RecurringPeriod = { Weekly: 0, Monthly: 1, Yearly: 2 } as const;
export type RecurringPeriod = (typeof RecurringPeriod)[keyof typeof RecurringPeriod];
export const RECURRING_PERIOD_LABELS: Record<RecurringPeriod, string> = {
  [RecurringPeriod.Weekly]: "Haftalık",
  [RecurringPeriod.Monthly]: "Aylık",
  [RecurringPeriod.Yearly]: "Yıllık",
};

export const NotificationType = { LowStock: 0, RecurringExpenseReminder: 1, DailyLossWarning: 2 } as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/** Etiket haritasından `<select>` seçenekleri üretir — her sayfada aynı dönüşümü tekrar yazmamak için. */
export function toOptions<T extends number>(labels: Record<T, string>): { value: string; label: string }[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label: label as string }));
}
