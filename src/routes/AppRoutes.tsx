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
import { AuditLogsPage } from "../pages/modules/AuditLogsPage";
import { DailyClosingPage } from "../pages/modules/DailyClosingPage";
import { DailySalesPage } from "../pages/modules/DailySalesPage";
import { DishesPage } from "../pages/modules/DishesPage";
import { EmployeesPage } from "../pages/modules/EmployeesPage";
import { ExpensesPage } from "../pages/modules/ExpensesPage";
import { ExpenseTypesPage } from "../pages/modules/ExpenseTypesPage";
import { IngredientsPage } from "../pages/modules/IngredientsPage";
import { PlatformsPage } from "../pages/modules/PlatformsPage";
import { RecurringExpensesPage } from "../pages/modules/RecurringExpensesPage";
import { ReportsPage } from "../pages/modules/ReportsPage";
import { StockMovementsPage } from "../pages/modules/StockMovementsPage";
import { SuppliersPage } from "../pages/modules/SuppliersPage";

/**
 * `navigation.ts`'teki path → sayfa bileşeni eşlemesi. Burada karşılığı olmayan bir path
 * `ComingSoonPage` ile açılır (yeni modül eklerken güvenli varsayılan).
 */
const PAGE_COMPONENTS: Partial<Record<string, ComponentType>> = {
  "/isletmeler": BusinessesPage,
  "/gun-sonu/satislar": DailySalesPage,
  "/gun-sonu/kapanis": DailyClosingPage,
  "/giderler": ExpensesPage,
  "/gider-turleri": ExpenseTypesPage,
  "/urunler": DishesPage,
  "/malzemeler": IngredientsPage,
  "/stok-hareketleri": StockMovementsPage,
  "/tedarikciler": SuppliersPage,
  "/duzenli-giderler": RecurringExpensesPage,
  "/platformlar": PlatformsPage,
  "/calisanlar": EmployeesPage,
  "/raporlar": ReportsPage,
  "/denetim-kayitlari": AuditLogsPage,
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
