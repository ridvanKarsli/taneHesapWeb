import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { LoginResponse } from "../types/auth";
import { clearGetCache } from "./getCacheStore";
import { clearSession, getAccessToken, getActingBusinessId, getPersistedRefreshToken, persistRefreshToken, setAccessToken } from "./tokenStore";

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/** `AllowAnonymous` uçları: 401 aldıklarında refresh denemesi tetiklenmez (sonsuz döngüyü önler). */
const ANONYMOUS_AUTH_PATHS = ["/api/auth/login", "/api/auth/refresh", "/api/auth/revoke"];

function isAnonymousAuthPath(url: string | undefined): boolean {
  return !!url && ANONYMOUS_AUTH_PATHS.some((path) => url.includes(path));
}

export const httpClient = axios.create({ baseURL: API_BASE_URL });

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !isAnonymousAuthPath(config.url)) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

/** Diğer sekmeler/istekler beklerken tek bir refresh isteği paylaşılır. */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getPersistedRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post<LoginResponse>(`${API_BASE_URL}/api/auth/refresh`, {
      refreshToken,
      actingBusinessId: getActingBusinessId(),
    });
    setAccessToken(response.data.accessToken);
    persistRefreshToken(response.data.refreshToken);
    return response.data.accessToken;
  } catch {
    return null;
  }
}

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retriedAfterRefresh?: boolean };

/** Refresh de başarısız olduğunda (oturum tamamen geçersiz) çağrılır — bkz. `AuthContext`. */
let onSessionExpired: (() => void) | null = null;

export function registerSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

/** Yazma istekleri tanım önbelleğini boşaltır (bkz. `cachedGet`). */
function invalidateAfterWrite(method: string | undefined): void {
  if (method && method.toLowerCase() !== "get") {
    clearGetCache();
  }
}

httpClient.interceptors.response.use(
  (response) => {
    invalidateAfterWrite(response.config.method);
    return response;
  },
  async (error: AxiosError) => {
    invalidateAfterWrite(error.config?.method);
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      originalRequest !== undefined &&
      !originalRequest._retriedAfterRefresh &&
      !isAnonymousAuthPath(originalRequest.url);

    if (!shouldAttemptRefresh) {
      throw error;
    }

    originalRequest._retriedAfterRefresh = true;

    refreshInFlight ??= refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });

    const newAccessToken = await refreshInFlight;

    if (!newAccessToken) {
      clearSession();
      onSessionExpired?.();
      throw error;
    }

    originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
    return httpClient(originalRequest);
  },
);
