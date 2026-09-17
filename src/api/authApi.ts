import { httpClient } from "./httpClient";
import type { LoginRequest, LoginResponse } from "../types/auth";

export interface TotpSetupResponse {
  secret: string;
  qrCodeUri: string;
}

/** Backend `AuthController` (bkz. proje raporu bölüm 2, 5, 8) ile birebir eşleşir. */
export const authApi = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>("/api/auth/login", request);
    return response.data;
  },

  async refresh(refreshToken: string): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>("/api/auth/refresh", { refreshToken });
    return response.data;
  },

  async revoke(refreshToken: string): Promise<void> {
    await httpClient.post("/api/auth/revoke", { refreshToken });
  },

  async setupTotp(): Promise<TotpSetupResponse> {
    const response = await httpClient.post<TotpSetupResponse>("/api/auth/totp/setup");
    return response.data;
  },
};

/**
 * Backend, TOTP kodu eksikken `LoginAsync` içinde tam olarak bu mesajla `Fail(...)` döner
 * (bkz. `TaneHesap.Application/Auth/AuthService.cs`). Login formu bu mesajı görünce
 * kullanıcı adı/şifre alanlarını gizleyip authenticator kodu alanını gösterir.
 */
export const TOTP_REQUIRED_ERROR_MESSAGE = "Authenticator kodu gereklidir.";

export function extractErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
  ) {
    return (error as { response: { data: { error: string } } }).response.data.error;
  }

  return "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.";
}
