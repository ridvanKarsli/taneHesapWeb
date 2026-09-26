import { Suspense, type ComponentType } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "../auth/RequireAuth";
import { useAuth } from "../auth/useAuth";
import { NAV_GROUPS, type NavGroup } from "../config/navigation";
import type { UserRole } from "../types/auth";
import { AppLayout } from "../layout/AppLayout";
import { MORE_PATH } from "../layout/navigationShell";
import { lazyPage } from "./lazyPage";
import { GroupLayout } from "../layout/GroupLayout";
import { LoginPage } from "../pages/auth/LoginPage";
import { MorePage } from "../pages/common/MorePage";
import { NotFoundPage } from "../pages/common/NotFoundPage";
import { PageFallback } from "../pages/common/PageFallback";
import { DashboardPage } from "../pages/dashboard/DashboardPage";

// Panel ve giriş ilk açılışta gerekir; diğer sayfalar ayrı parçalara bölünür ve ilk girildiklerinde yüklenir
// (ilk açılışta indirilen JavaScript küçülür; PWA ön belleği hepsini arka planda yine de indirir).
const BusinessesPage = lazyPage(() => import("../pages/businesses/BusinessesPage"), "BusinessesPage");
const ActivityPage = lazyPage(() => import("../pages/modules/ActivityPage"), "ActivityPage");
const AuditLogsPage = lazyPage(() => import("../pages/modules/AuditLogsPage"), "AuditLogsPage");
const DailySalesPage = lazyPage(() => import("../pages/modules/DailySalesPage"), "DailySalesPage");
const DishesPage = lazyPage(() => import("../pages/modules/DishesPage"), "DishesPage");
const EmployeesPage = lazyPage(() => import("../pages/modules/EmployeesPage"), "EmployeesPage");
const ExpensesPage = lazyPage(() => import("../pages/modules/ExpensesPage"), "ExpensesPage");
const ExpenseTypesPage = lazyPage(() => import("../pages/modules/ExpenseTypesPage"), "ExpenseTypesPage");
const IngredientsPage = lazyPage(() => import("../pages/modules/IngredientsPage"), "IngredientsPage");
const MonthlyReportPage = lazyPage(() => import("../pages/modules/MonthlyReportPage"), "MonthlyReportPage");
const MyWalletPage = lazyPage(() => import("../pages/modules/MyWalletPage"), "MyWalletPage");
const PaymentCardsPage = lazyPage(() => import("../pages/modules/PaymentCardsPage"), "PaymentCardsPage");
const PeriodReportPage = lazyPage(() => import("../pages/modules/PeriodReportPage"), "PeriodReportPage");
const PlatformsPage = lazyPage(() => import("../pages/modules/PlatformsPage"), "PlatformsPage");
const RecurringExpensesPage = lazyPage(() => import("../pages/modules/RecurringExpensesPage"), "RecurringExpensesPage");
const StockMovementsPage = lazyPage(() => import("../pages/modules/StockMovementsPage"), "StockMovementsPage");
const SuppliersPage = lazyPage(() => import("../pages/modules/SuppliersPage"), "SuppliersPage");
const TreasuryPage = lazyPage(() => import("../pages/modules/TreasuryPage"), "TreasuryPage");

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
  return PageComponent ? (
    <Suspense fallback={<PageFallback />}>
      <PageComponent />
    </Suspense>
  ) : (
    <NotFoundPage />
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
