import { httpClient } from "./httpClient";
import type { LoginRequest, LoginResponse } from "../types/auth";

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
};
