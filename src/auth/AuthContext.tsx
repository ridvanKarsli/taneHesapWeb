import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/authApi";
import { registerSessionExpiredHandler } from "../api/httpClient";
import { clearSession, getActingBusinessId, getPersistedRefreshToken, persistActingBusinessId, persistRefreshToken, setAccessToken } from "../api/tokenStore";
import { toAuthenticatedUser, type AuthenticatedUser, type LoginResponse } from "../types/auth";

export type AuthStatus = "checking-session" | "authenticated" | "anonymous";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthenticatedUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Süper yönetici: seçilen işletmeye işletme sahibi yetkisiyle gir. */
  enterBusiness: (businessId: string) => Promise<void>;
  /** İşletme içindeki süper yönetici kendi kimliğine döner. */
  exitBusiness: () => Promise<void>;
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

  /** Sunucudan gelen oturumu tek yerden uygular: token'lar, işletme içi görünüm bayrağı ve kullanıcı. */
  function applySession(response: LoginResponse) {
    setAccessToken(response.accessToken);
    persistRefreshToken(response.refreshToken);
    persistActingBusinessId(response.isActingAsBusiness ? response.businessId : null);
    setUser(toAuthenticatedUser(response));
  }

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
      .refresh(persistedRefreshToken, getActingBusinessId())
      .then((response) => {
        applySession(response);
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
      async login(username, password) {
        const response = await authApi.login({ username, password });
        applySession(response);
        setStatus("authenticated");
      },
      async enterBusiness(businessId) {
        applySession(await authApi.enterBusiness(businessId));
      },
      async exitBusiness() {
        const refreshToken = getPersistedRefreshToken();
        if (!refreshToken) {
          return;
        }
        persistActingBusinessId(null);
        applySession(await authApi.refresh(refreshToken, null));
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
