import { httpClient } from "./httpClient";
import type { LoginRequest, LoginResponse } from "../types/auth";

/** Backend `AuthController` (bkz. proje raporu bölüm 2, 5, 8) ile birebir eşleşir. */
export const authApi = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>("/api/auth/login", request);
    return response.data;
  },

  /** `actingBusinessId` verilirse (süper yönetici işletme içindeyken) oturum o işletmede sürer; verilmezse kendi kimliğine döner. */
  async refresh(refreshToken: string, actingBusinessId: string | null = null): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>("/api/auth/refresh", { refreshToken, actingBusinessId });
    return response.data;
  },

  /** Süper yönetici seçtiği işletmeye girer: dönen oturum o işletmenin sahibi yetkisindedir. */
  async enterBusiness(businessId: string): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>("/api/auth/enter-business", { businessId });
    return response.data;
  },

  async revoke(refreshToken: string): Promise<void> {
    await httpClient.post("/api/auth/revoke", { refreshToken });
  },
};
