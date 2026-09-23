/** Backend `TaneHesap.Application.Activity` DTO'ları — okunabilir işlem geçmişi (bkz. proje raporu 3.6). */
export interface ActivityEntryDto {
  id: string;
  timestampUtc: string;
  userId: string;
  userName: string;
  /** Ekledi / Değiştirdi / Sildi */
  action: string;
  entityName: string;
  /** Türkçe kayıt türü (Gider, Satış, …) */
  kind: string;
  entityId: string;
  summary: string;
  amount: number | null;
}

export interface ActivityQuery {
  fromDate?: string;
  toDate?: string;
  userId?: string;
  entityName?: string;
}

export interface ActivityUserDto {
  userId: string;
  fullName: string;
  role: string;
}

export interface ActivityKindDto {
  entityName: string;
  label: string;
}
