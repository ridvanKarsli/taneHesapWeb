import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/authApi";
import { registerSessionExpiredHandler } from "../api/httpClient";
import { clearSession, getPersistedRefreshToken, persistRefreshToken, setAccessToken } from "../api/tokenStore";
import { toAuthenticatedUser, type AuthenticatedUser } from "../types/auth";

export type AuthStatus = "checking-session" | "authenticated" | "anonymous";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthenticatedUser | null;
  login: (username: string, password: string, totpCode: string | null) => Promise<void>;
  logout: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Uygulamanın tek kimlik doğrulama kaynağı (Single Responsibility). Token'ların nasıl saklandığı
 * `api/tokenStore`'a devredilir; bu bileşen sadece React tarafındaki oturum durumunu yönetir.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking-session");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    registerSessionExpiredHandler(() => {
      setUser(null);
      setStatus("anonymous");
    });

    const persistedRefreshToken = getPersistedRefreshToken();
    if (!persistedRefreshToken) {
      setStatus("anonymous");
      return;
    }

    authApi
      .refresh(persistedRefreshToken)
      .then((response) => {
        setAccessToken(response.accessToken);
        persistRefreshToken(response.refreshToken);
        setUser(toAuthenticatedUser(response));
        setStatus("authenticated");
      })
      .catch(() => {
        clearSession();
        setStatus("anonymous");
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async login(username, password, totpCode) {
        const response = await authApi.login({ username, password, totpCode });
        setAccessToken(response.accessToken);
        persistRefreshToken(response.refreshToken);
        setUser(toAuthenticatedUser(response));
        setStatus("authenticated");
      },
      async logout() {
        const refreshToken = getPersistedRefreshToken();
        clearSession();
        setUser(null);
        setStatus("anonymous");
        if (refreshToken) {
          await authApi.revoke(refreshToken).catch(() => {
            // Sunucuya ulaşılamasa bile yerel oturum zaten temizlendi.
          });
        }
      },
    }),
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
