import { LogOut, Moon, Sun, Undo2, Wheat } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { NotificationsBell } from "../components/NotificationsBell";
import { visibleGroups } from "../config/navigation";
import { BottomNav } from "./BottomNav";
import { initialsOf } from "./navigationShell";
import { useTheme } from "../theme/useTheme";
import { ROLE_LABELS } from "../types/auth";
import "./AppLayout.css";

const todayLabel = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

/**
 * Uygulama kabuğu. Masaüstünde (> 960px) açık renkli kenar çubuğu; mobilde kenar çubuğu ve çekmece yoktur —
 * yalnızca alt sekme çubuğu vardır (bkz. BottomNav: 4 grup + "Daha fazla" sayfası). Menü öğeleri
 * `config/navigation.ts`'ten role göre üretilir (tek kaynak).
 */
export function AppLayout() {
  const { user, logout, exitBusiness } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  if (!user) {
    // RequireAuth bu duruma girmeden yönlendirir; TypeScript için erken çıkış.
    return null;
  }

  // Tek görünür sayfası olan grup, o sayfanın adıyla ve adresiyle bağlanır (örn. SUPER_ADMIN için "Denetim Kayıtları").
  const navLinks = visibleGroups(user.role).map((group) => ({
    key: group.path,
    to: group.pages.length === 1 ? group.pages[0].path : group.path,
    label: group.pages.length === 1 ? group.pages[0].label : group.label,
    shortLabel: group.pages.length === 1 ? group.pages[0].label : (group.shortLabel ?? group.label),
    description: group.description,
    icon: group.icon,
    tone: group.tone,
  }));
  const initials = initialsOf(user.fullName);
  const themeLabel = theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç";

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Ana menü">
        <div className="app-sidebar-brand">
          <span className="brand-mark app-brand-mark" aria-hidden="true">
            <Wheat size={20} strokeWidth={2.2} />
          </span>
          <div>
            <strong>taneHesap</strong>
            <span>{user.businessName ?? ROLE_LABELS[user.role]}</span>
          </div>
        </div>

        <nav className="app-sidebar-nav">
          {navLinks.map((item) => (
            <NavLink key={item.key} to={item.to} end={item.to === "/"} className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}>
              <item.icon size={20} strokeWidth={2} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          <span className="app-user-avatar" aria-hidden="true">
            {initials}
          </span>
          <div className="app-sidebar-user">
            <strong>{user.fullName}</strong>
            <span>{ROLE_LABELS[user.role]}</span>
          </div>
          <button type="button" className="app-icon-button" onClick={() => void logout()} aria-label="Çıkış yap" title="Çıkış yap">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-start">
            <span className="app-topbar-brand">
              <span className="brand-mark" aria-hidden="true">
                <Wheat size={16} strokeWidth={2.2} />
              </span>
              taneHesap
            </span>
            <span className="app-topbar-date">{todayLabel}</span>
          </div>
          <div className="app-topbar-actions">
            <button type="button" className="app-icon-button" onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}>
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <NotificationsBell />
            <div className="app-topbar-user">
              <span className="app-user-avatar" aria-hidden="true">
                {initials}
              </span>
              <div>
                <strong>{user.fullName}</strong>
                <span>{ROLE_LABELS[user.role]}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="app-content">
          {user.isActingAsBusiness && (
            <div className="app-acting-banner" role="status">
              <span>
                Süper yönetici olarak <strong>{user.businessName}</strong> içindesiniz; yaptığınız her işlem bu işletmeye yazılır.
              </span>
              <button type="button" className="ui-button secondary small" onClick={() => void exitBusiness()}>
                <Undo2 size={14} aria-hidden="true" />
                İşletmeden çık
              </button>
            </div>
          )}
          <Outlet />
        </main>

        <BottomNav items={navLinks} />
      </div>
    </div>
  );
}
