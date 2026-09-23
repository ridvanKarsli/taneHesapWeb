import type { ComponentType } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "../auth/RequireAuth";
import { useAuth } from "../auth/useAuth";
import { NAV_GROUPS, type NavGroup } from "../config/navigation";
import type { UserRole } from "../types/auth";
import { AppLayout } from "../layout/AppLayout";
import { GroupLayout } from "../layout/GroupLayout";
import { LoginPage } from "../pages/auth/LoginPage";
import { BusinessesPage } from "../pages/businesses/BusinessesPage";
import { NotFoundPage } from "../pages/common/NotFoundPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { ActivityPage } from "../pages/modules/ActivityPage";
import { AuditLogsPage } from "../pages/modules/AuditLogsPage";
import { DailyClosingPage } from "../pages/modules/DailyClosingPage";
import { DailySalesPage } from "../pages/modules/DailySalesPage";
import { DishesPage } from "../pages/modules/DishesPage";
import { EmployeesPage } from "../pages/modules/EmployeesPage";
import { ExpensesPage } from "../pages/modules/ExpensesPage";
import { ExpenseTypesPage } from "../pages/modules/ExpenseTypesPage";
import { IngredientsPage } from "../pages/modules/IngredientsPage";
import { LossReportsPage } from "../pages/modules/LossReportsPage";
import { MonthlyReportPage } from "../pages/modules/MonthlyReportPage";
import { MyWalletPage } from "../pages/modules/MyWalletPage";
import { PaymentCardsPage } from "../pages/modules/PaymentCardsPage";
import { PeriodReportPage } from "../pages/modules/PeriodReportPage";
import { PlatformsPage } from "../pages/modules/PlatformsPage";
import { RecurringExpensesPage } from "../pages/modules/RecurringExpensesPage";
import { StockMovementsPage } from "../pages/modules/StockMovementsPage";
import { SuppliersPage } from "../pages/modules/SuppliersPage";
import { TreasuryPage } from "../pages/modules/TreasuryPage";

/** `navigation.ts`'teki sayfa yolu → bileşen eşlemesi. Yeni sayfa = navigation'a bir satır + buraya bir satır. */
const PAGE_COMPONENTS: Record<string, ComponentType> = {
  "/": DashboardPage,
  "/isletmeler": BusinessesPage,
  "/gun-sonu/satislar": DailySalesPage,
  "/gun-sonu/kapanis": DailyClosingPage,
  "/finans/giderler": ExpensesPage,
  "/finans/cuzdanim": MyWalletPage,
  "/finans/kasa": TreasuryPage,
  "/finans/kartlarim": PaymentCardsPage,
  "/finans/islem-gecmisi": ActivityPage,
  "/finans/duzenli-giderler": RecurringExpensesPage,
  "/mutfak/urunler": DishesPage,
  "/mutfak/malzemeler": IngredientsPage,
  "/mutfak/stok": StockMovementsPage,
  "/mutfak/tedarikciler": SuppliersPage,
  "/raporlar/donem": PeriodReportPage,
  "/raporlar/aylik": MonthlyReportPage,
  "/raporlar/fire": LossReportsPage,
  "/tanimlar/gider-turleri": ExpenseTypesPage,
  "/tanimlar/platformlar": PlatformsPage,
  "/tanimlar/calisanlar": EmployeesPage,
  "/tanimlar/denetim": AuditLogsPage,
};

/** Grup rotası: `GroupLayout` kabuğu altında her sayfa kendi rol korumasıyla; grubun kökü ilk izinli sayfaya yönlenir. */
function groupRoutes(group: NavGroup, role: UserRole | undefined) {
  const firstAllowed = group.pages.find((page) => role !== undefined && page.roles.includes(role)) ?? group.pages[0];
  return (
    <Route key={group.path} path={group.path} element={<GroupLayout group={group} />}>
      <Route index element={<Navigate to={firstAllowed.path} replace />} />
      {group.pages.map((page) => {
        const PageComponent = PAGE_COMPONENTS[page.path];
        return (
          <Route key={page.path} path={page.path.slice(group.path.length + 1)} element={<RequireAuth allowedRoles={page.roles} />}>
            <Route index element={PageComponent ? <PageComponent /> : <NotFoundPage />} />
          </Route>
        );
      })}
    </Route>
  );
}

/**
 * Rota tablosu `config/navigation.ts`'ten üretilir (tek kaynak). Rol kontrolü kenar çubuğunda ve burada
 * `RequireAuth allowedRoles` ile uygulanır; yetkisiz bir adres doğrudan yazılsa bile panele dönülür.
 */
export function AppRoutes() {
  const { status, user } = useAuth();

  if (status === "checking-session") {
    return <div className="page-loading">Yükleniyor…</div>;
  }

  return (
    <Routes>
      <Route path="/giris" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          {NAV_GROUPS.filter((group) => group.path !== "/").map((group) => groupRoutes(group, user?.role))}
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
