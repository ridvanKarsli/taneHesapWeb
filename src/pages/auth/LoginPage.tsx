import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { extractErrorMessage, TOTP_REQUIRED_ERROR_MESSAGE } from "../../api/authApi";
import { useAuth } from "../../auth/useAuth";
import "./LoginPage.css";

interface LocationState {
  from?: { pathname: string };
}

/**
 * SUPER_ADMIN/ADMIN girişinde authenticator kodu zorunlu, EMPLOYEE'de yok (bkz. proje raporu
 * bölüm 2). Backend bu ayrımı kullanıcı adına bakarak kendi yapıyor; frontend önce
 * kullanıcı adı/şifre ile dener, backend "Authenticator kodu gereklidir." derse ikinci adımda
 * kod alanını gösterir.
 */
export function LoginPage() {
  const { login, status, user } = useAuth();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpRequired, setTotpRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === "authenticated" && user) {
    const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? "/";
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(username, password, totpRequired ? totpCode : null);
    } catch (error) {
      const message = extractErrorMessage(error);
      if (message === TOTP_REQUIRED_ERROR_MESSAGE) {
        setTotpRequired(true);
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>taneHesap</h1>
        <p className="login-subtitle">Meydan Pilavcısı — gelir/gider yönetim paneli</p>

        {!totpRequired && (
          <>
            <label htmlFor="username">Kullanıcı adı</label>
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              autoFocus
            />

            <label htmlFor="password">Şifre</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </>
        )}

        {totpRequired && (
          <>
            <p className="login-totp-hint">
              Bu hesap için authenticator uygulamanızdaki 6 haneli kodu girin.
            </p>
            <label htmlFor="totp">Authenticator kodu</label>
            <input
              id="totp"
              value={totpCode}
              onChange={(event) => setTotpCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
            />
          </>
        )}

        {errorMessage && <p className="login-error">{errorMessage}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>

        {totpRequired && (
          <button
            type="button"
            className="login-secondary-action"
            onClick={() => {
              setTotpRequired(false);
              setTotpCode("");
              setErrorMessage(null);
            }}
          >
            Geri dön
          </button>
        )}
      </form>
    </div>
  );
}
