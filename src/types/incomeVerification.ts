/** Backend `IncomeVerificationDayDto` — bir günün dükkân içi gelir doğrulaması (fark = gerçek − beklenen). */
export interface IncomeVerificationDayDto {
  date: string;
  hasInStoreSales: boolean;
  expectedCash: number;
  expectedCard: number;
  isVerified: boolean;
  actualCash: number | null;
  actualCard: number | null;
  cashDifference: number | null;
  cardDifference: number | null;
  note: string | null;
  verifiedAtUtc: string | null;
}

export interface SaveIncomeVerificationRequest {
  actualCash: number;
  actualCard: number;
  note: string | null;
}
