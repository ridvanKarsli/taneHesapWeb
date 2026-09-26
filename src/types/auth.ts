/**
 * Backend `TaneHesap.Domain.Enums.UserRole` ile birebir aynı sayısal değerlere sahiptir
 * (System.Text.Json varsayılan olarak enum'ları sayı olarak serileştirir — bkz. proje raporu bölüm 8).
 * `erasableSyntaxOnly` (tsconfig) gerçek TS enum'una izin vermediği için `as const` nesnesi +
 * union type kullanılır; kullanım yeri (`UserRole.Admin` vb.) enum ile birebir aynıdır.
 */
export const UserRole = {
  SuperAdmin: 0,
  Admin: 1,
  Employee: 2,
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: "Süper Yönetici",
  [UserRole.Admin]: "İşletme Sahibi",
  [UserRole.Employee]: "Çalışan",
};

/** Backend `LoginRequest` (TaneHesap.Application.Auth.AuthDtos) ile birebir eşleşir. */
export interface LoginRequest {
  username: string;
  password: string;
}

/** Backend `LoginResponse` ile birebir eşleşir. */
export interface LoginResponse {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
  userId: string;
  fullName: string;
  role: UserRole;
  businessId: string | null;
  businessName: string | null;
  /** Süper yönetici bir işletmenin içinde (o işletmenin sahibi gibi) çalışıyor. */
  isActingAsBusiness: boolean;
}

export interface AuthenticatedUser {
  userId: string;
  fullName: string;
  /** Etkin rol: işletme içindeki süper yönetici burada Admin'dir (tüm sayfalar/uçlar işletme sahibi gibi çalışır). */
  role: UserRole;
  businessId: string | null;
  businessName: string | null;
  isActingAsBusiness: boolean;
}

export function toAuthenticatedUser(response: LoginResponse): AuthenticatedUser {
  return {
    userId: response.userId,
    fullName: response.fullName,
    role: response.role,
    businessId: response.businessId,
    businessName: response.businessName ?? null,
    isActingAsBusiness: response.isActingAsBusiness ?? false,
  };
}
