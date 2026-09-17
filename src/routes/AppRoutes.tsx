import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "../auth/RequireAuth";
import { useAuth } from "../auth/useAuth";
import { NAV_ITEMS } from "../config/navigation";
import { AppLayout } from "../layout/AppLayout";
import { LoginPage } from "../pages/auth/LoginPage";
import { ComingSoonPage } from "../pages/common/ComingSoonPage";
import { NotFoundPage } from "../pages/common/NotFoundPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";

/**
 * Rota tablosu `config/navigation.ts`'ten üretilir (tek kaynak — bkz. o dosyadaki not). Rol
 * kontrolü zaten `AppLayout`'un kenar çubuğunda ve burada `RequireAuth allowedRoles` ile
 * uygulanıyor; bir kullanıcı yetkisi olmayan bir path'i doğrudan yazsa bile `RequireAuth`
 * onu paneline geri yönlendirir.
 */
export function AppRoutes() {
  const { status } = useAuth();

  if (status === "checking-session") {
    return <div className="page-loading">Yükleniyor…</div>;
  }

  return (
    <Routes>
      <Route path="/giris" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />

          {NAV_ITEMS.filter((item) => item.path !== "/").map((item) => (
            <Route
              key={item.path}
              path={item.path.slice(1)}
              element={
                <RequireAuth allowedRoles={item.roles} />
              }
            >
              <Route index element={<ComingSoonPage title={item.label} />} />
            </Route>
          ))}
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
