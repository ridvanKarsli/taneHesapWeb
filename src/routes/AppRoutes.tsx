import type { ComponentType } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "../auth/RequireAuth";
import { useAuth } from "../auth/useAuth";
import { NAV_GROUPS, type NavGroup } from "../config/navigation";
import type { UserRole } from "../types/auth";
import { AppLayout } from "../layout/AppLayout";
import { MORE_PATH } from "../layout/navigationShell";
import { GroupLayout } from "../layout/GroupLayout";
import { LoginPage } from "../pages/auth/LoginPage";
import { BusinessesPage } from "../pages/businesses/BusinessesPage";
import { MorePage } from "../pages/common/MorePage";
import { NotFoundPage } from "../pages/common/NotFoundPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { ActivityPage } from "../pages/modules/ActivityPage";
import { AuditLogsPage } from "../pages/modules/AuditLogsPage";
import { DailySalesPage } from "../pages/modules/DailySalesPage";
import { DishesPage } from "../pages/modules/DishesPage";
import { EmployeesPage } from "../pages/modules/EmployeesPage";
import { ExpensesPage } from "../pages/modules/ExpensesPage";
import { ExpenseTypesPage } from "../pages/modules/ExpenseTypesPage";
import { IngredientsPage } from "../pages/modules/IngredientsPage";
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
  "/tanimlar/gider-turleri": ExpenseTypesPage,
  "/tanimlar/platformlar": PlatformsPage,
  "/tanimlar/calisanlar": EmployeesPage,
  "/tanimlar/denetim": AuditLogsPage,
};

/**
 * Grup rotası: `GroupLayout` kabuğu altında her sayfa kendi rol korumasıyla. Grubun kökü ilk izinli sayfaya
 * yönlenir; sayfanın yolu grubun yoluyla aynıysa (tek sayfalık grup, örn. "/isletmeler") sayfa doğrudan
 * grubun index'idir — aksi halde index kendi adresine yönlenip hiçbir şey göstermezdi.
 */
function groupRoutes(group: NavGroup, role: UserRole | undefined) {
  const firstAllowed = group.pages.find((page) => role !== undefined && page.roles.includes(role)) ?? group.pages[0];
  const rootPage = group.pages.find((page) => page.path === group.path);

  return (
    <Route key={group.path} path={group.path} element={<GroupLayout group={group} />}>
      {rootPage ? (
        // Yolsuz (pathless) sarmalayıcı: index rotası çocuk alamaz, rol koruması bu katmanda uygulanır.
        <Route element={<RequireAuth allowedRoles={rootPage.roles} />}>
          <Route index element={pageElement(rootPage.path)} />
        </Route>
      ) : (
        <Route index element={<Navigate to={firstAllowed.path} replace />} />
      )}
      {group.pages
        .filter((page) => page !== rootPage)
        .map((page) => (
          <Route key={page.path} path={page.path.slice(group.path.length + 1)} element={<RequireAuth allowedRoles={page.roles} />}>
            <Route index element={pageElement(page.path)} />
          </Route>
        ))}
    </Route>
  );
}

function pageElement(path: string) {
  const PageComponent = PAGE_COMPONENTS[path];
  return PageComponent ? <PageComponent /> : <NotFoundPage />;
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
          <Route path={MORE_PATH} element={<MorePage />} />
          {NAV_GROUPS.filter((group) => group.path !== "/").map((group) => groupRoutes(group, user?.role))}
        </Route>
      </Route>

      {/* Kaldırılan sayfaların eski adresleri (yer imleri, ana ekran kısayolları) */}
      <Route path="/gun-sonu/kapanis" element={<Navigate to="/gun-sonu/satislar" replace />} />
      <Route path="/raporlar/fire" element={<Navigate to="/raporlar/donem" replace />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
