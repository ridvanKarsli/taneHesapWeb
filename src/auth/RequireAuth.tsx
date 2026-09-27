import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import type { AuthenticatedUser } from "../types/auth";

interface RequireAuthProps {
  /** Belirtilmezse sadece giriş yapmış olmak yeterlidir; belirtilirse kullanıcı bu koşulu sağlamalıdır (rol vb.). */
  allow?: (user: AuthenticatedUser) => boolean;
}

export function RequireAuth({ allow }: RequireAuthProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "checking-session") {
    return <div className="page-loading">Oturum kontrol ediliyor…</div>;
  }

  if (status === "anonymous" || !user) {
    return <Navigate to="/giris" state={{ from: location }} replace />;
  }

  if (allow && !allow(user)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
