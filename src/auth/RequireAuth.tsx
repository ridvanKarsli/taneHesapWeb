import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import type { UserRole } from "../types/auth";

interface RequireAuthProps {
  /** Belirtilmezse sadece giriş yapmış olmak yeterlidir; belirtilirse rol de eşleşmelidir. */
  allowedRoles?: UserRole[];
}

export function RequireAuth({ allowedRoles }: RequireAuthProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "checking-session") {
    return <div className="page-loading">Oturum kontrol ediliyor…</div>;
  }

  if (status === "anonymous" || !user) {
    return <Navigate to="/giris" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
