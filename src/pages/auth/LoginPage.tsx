import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { extractErrorMessage } from "../../api/authApi";
import { useAuth } from "../../auth/useAuth";
import "./LoginPage.css";

interface LocationState {
  from?: { pathname: string };
}

/** Tüm roller (SUPER_ADMIN/ADMIN/EMPLOYEE) kullanıcı adı/şifre ile giriş yapar (bkz. proje raporu bölüm 2, 7). */
export function LoginPage() {
  const { login, status, user } = useAuth();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
      await login(username, password);
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <span className="login-brand-mark" aria-hidden="true">
            🌾
          </span>
          <div>
            <h1>taneHesap</h1>
            <p className="login-subtitle">Meydan Pilavcısı — gelir/gider yönetim paneli</p>
          </div>
        </div>

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

        {errorMessage && <p className="login-error">{errorMessage}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>
      </form>
    </div>
  );
}
