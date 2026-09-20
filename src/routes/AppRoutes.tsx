import type { ComponentType } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "../auth/RequireAuth";
import { useAuth } from "../auth/useAuth";
import { NAV_ITEMS } from "../config/navigation";
import { AppLayout } from "../layout/AppLayout";
import { LoginPage } from "../pages/auth/LoginPage";
import { BusinessesPage } from "../pages/businesses/BusinessesPage";
import { ComingSoonPage } from "../pages/common/ComingSoonPage";
import { NotFoundPage } from "../pages/common/NotFoundPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";

/** `navigation.ts`'teki path'lerden gerçek sayfası yazılmış olanlar — geri kalanı `ComingSoonPage` kullanır. */
const PAGE_COMPONENTS: Partial<Record<string, ComponentType>> = {
  "/isletmeler": BusinessesPage,
};

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

          {NAV_ITEMS.filter((item) => item.path !== "/").map((item) => {
            const PageComponent = PAGE_COMPONENTS[item.path];
            return (
              <Route
                key={item.path}
                path={item.path.slice(1)}
                element={
                  <RequireAuth allowedRoles={item.roles} />
                }
              >
                <Route
                  index
                  element={PageComponent ? <PageComponent /> : <ComingSoonPage title={item.label} icon={item.icon} />}
                />
              </Route>
            );
          })}
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
