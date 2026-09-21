import { ChartColumn, Eye, EyeOff, Lock, LogIn, MoonStar, ReceiptText, User, Wheat } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { extractErrorMessage } from "../../api/apiError";
import { useAuth } from "../../auth/useAuth";
import { ErrorMessage } from "../../components/ui/AsyncState";
import "./LoginPage.css";

interface LocationState {
  from?: { pathname: string };
}

const HIGHLIGHTS = [
  { icon: ReceiptText, text: "Gün sonu satışları ve giderler tek yerde" },
  { icon: MoonStar, text: "Beklenen ile gerçekleşen arasındaki fire/kayıp" },
  { icon: ChartColumn, text: "Nakit, kart ve paket servis kırılımlı raporlar" },
];

/** Tüm roller (SUPER_ADMIN/ADMIN/EMPLOYEE) kullanıcı adı/şifre ile giriş yapar (bkz. proje raporu bölüm 2, 7). */
export function LoginPage() {
  const { login, status, user } = useAuth();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      <aside className="login-showcase" aria-hidden="true">
        <div className="login-showcase-brand">
          <span className="brand-mark">
            <Wheat size={24} strokeWidth={2.2} />
          </span>
          taneHesap
        </div>
        <div>
          <h2>İşletmenin hesabı, tane tane.</h2>
          <ul>
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span>
                  <Icon size={18} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <small>Meydan Pilavcısı · yönetim paneli</small>
        <Wheat className="login-showcase-art" size={260} strokeWidth={0.9} />
      </aside>

      <main className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-brand">
            <span className="brand-mark login-brand-mark" aria-hidden="true">
              <Wheat size={24} strokeWidth={2.2} />
            </span>
            <div>
              <h1>Tekrar hoş geldin</h1>
              <p className="login-subtitle">Devam etmek için hesabına giriş yap.</p>
            </div>
          </div>

          <label htmlFor="username">Kullanıcı adı</label>
          <div className="login-input">
            <User size={18} aria-hidden="true" />
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
              autoFocus
            />
          </div>

          <label htmlFor="password">Şifre</label>
          <div className="login-input">
            <Lock size={18} aria-hidden="true" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="login-input-toggle"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {errorMessage && <ErrorMessage message={errorMessage} />}

          <button type="submit" className="login-submit" disabled={isSubmitting}>
            <LogIn size={18} aria-hidden="true" />
            {isSubmitting ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
        </form>
      </main>
    </div>
  );
}
