/**
 * Backend `TaneHesap.Domain.Enums` ile birebir aynı sayısal değerler (System.Text.Json enum'ları
 * sayı olarak serileştirir). `erasableSyntaxOnly` gerçek TS enum'una izin vermediği için
 * `UserRole` (bkz. `auth.ts`) ile aynı `as const` + etiket haritası deseni kullanılır.
 */

/**
 * Satışta yalnızca Cash/Card kullanılır; giderde ödemenin hangi kasadan çıktığını belirler
 * (Cash = nakit kasası, Card = tanımlı kredi kartı, Bank = kart kasası/banka). bkz. proje raporu 3.15.
 */
export const PaymentMethod = { Cash: 0, Card: 1, Bank: 2 } as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: "Nakit",
  [PaymentMethod.Card]: "Kart",
  [PaymentMethod.Bank]: "Banka / kart kasası",
};
/** Satış girişinde sunulan ödeme şekilleri (banka/havale satışta kullanılmaz). */
export const SALES_PAYMENT_METHOD_LABELS: Partial<Record<PaymentMethod, string>> = {
  [PaymentMethod.Cash]: "Nakit",
  [PaymentMethod.Card]: "Kart",
};
/** Gider girişinde sunulan ödeme şekilleri — nakit kasası, kredi kartı (kart seçilir) veya kart kasası. */
export const EXPENSE_PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: "Nakit (nakit kasası)",
  [PaymentMethod.Card]: "Kredi kartı",
  [PaymentMethod.Bank]: "Kart kasası / banka",
};

/** "Sabit gider" kaldırıldı — sabit giderler Düzenli Giderler'de yönetilir; Personnel: çalışan ödemeleri (cüzdandan düşer). */
export const ExpenseCategory = { Material: 0, Other: 2, Personnel: 3 } as const;
export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.Material]: "Malzeme",
  [ExpenseCategory.Other]: "Diğer",
  [ExpenseCategory.Personnel]: "Personel",
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

/** Periyot birimi — "N ayda bir" gibi serbest periyot seçiminde. */
export const RECURRING_PERIOD_UNITS: Record<RecurringPeriod, string> = {
  [RecurringPeriod.Weekly]: "hafta",
  [RecurringPeriod.Monthly]: "ay",
  [RecurringPeriod.Yearly]: "yıl",
};

/** "Aylık", "3 ayda bir", "2 haftada bir" … */
export function recurringScheduleLabel(period: RecurringPeriod, intervalCount: number): string {
  if (!intervalCount || intervalCount <= 1) {
    return RECURRING_PERIOD_LABELS[period];
  }
  return `${intervalCount} ${RECURRING_PERIOD_UNITS[period]}da bir`; // ayda / haftada / yılda
}

export const NotificationType = { LowStock: 0, RecurringExpenseReminder: 1, DailyLossWarning: 2, MonthlyReport: 3 } as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const TreasuryAccount = { Cash: 0, Bank: 1, CreditCard: 2 } as const;
export type TreasuryAccount = (typeof TreasuryAccount)[keyof typeof TreasuryAccount];
export const TREASURY_ACCOUNT_LABELS: Record<TreasuryAccount, string> = {
  [TreasuryAccount.Cash]: "Nakit kasası",
  [TreasuryAccount.Bank]: "Kart kasası",
  [TreasuryAccount.CreditCard]: "Kredi kartı",
};

export const TreasuryTransactionKind = { SalesRevenue: 0, CardFee: 1, Expense: 2, Transfer: 3, CardPayment: 4, ManualAdjustment: 5 } as const;
export type TreasuryTransactionKind = (typeof TreasuryTransactionKind)[keyof typeof TreasuryTransactionKind];
export const TREASURY_KIND_LABELS: Record<TreasuryTransactionKind, string> = {
  [TreasuryTransactionKind.SalesRevenue]: "Satış geliri",
  [TreasuryTransactionKind.CardFee]: "Kart komisyonu",
  [TreasuryTransactionKind.Expense]: "Gider",
  [TreasuryTransactionKind.Transfer]: "Transfer",
  [TreasuryTransactionKind.CardPayment]: "Kart ödemesi",
  [TreasuryTransactionKind.ManualAdjustment]: "Düzeltme",
};

/** Etiket haritasından `<select>` seçenekleri üretir — her sayfada aynı dönüşümü tekrar yazmamak için. */
export function toOptions<T extends number>(labels: Partial<Record<T, string>>): { value: string; label: string }[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label: label as string }));
}
