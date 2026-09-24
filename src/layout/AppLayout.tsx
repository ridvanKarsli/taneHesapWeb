import { LogOut, Menu, Moon, Sun, Wheat, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { NotificationsBell } from "../components/NotificationsBell";
import { visibleGroups } from "../config/navigation";
import { BottomNav } from "./BottomNav";
import { useTheme } from "../theme/useTheme";
import { ROLE_LABELS } from "../types/auth";
import "./AppLayout.css";

const todayLabel = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function initialsOf(fullName: string): string {
  return fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Uygulama kabuğu: masaüstünde sabit kenar çubuğu, mobilde (≤ 960px) hamburger ile açılan çekmece.
 * Menü öğeleri `config/navigation.ts`'ten role göre üretilir (tek kaynak).
 */
export function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    if (!isNavOpen) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setIsNavOpen(false);
    window.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("nav-open");
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("nav-open");
    };
  }, [isNavOpen]);

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
    icon: group.icon,
  }));
  const initials = initialsOf(user.fullName);
  const themeLabel = theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç";

  return (
    <div className="app-shell">
      <aside className={`app-sidebar${isNavOpen ? " open" : ""}`} aria-label="Ana menü">
        <div className="app-sidebar-brand">
          <span className="brand-mark app-brand-mark" aria-hidden="true">
            <Wheat size={20} strokeWidth={2.2} />
          </span>
          <div>
            <strong>taneHesap</strong>
            <span>Meydan Pilavcısı</span>
          </div>
          <button type="button" className="app-icon-button app-sidebar-close" onClick={() => setIsNavOpen(false)} aria-label="Menüyü kapat">
            <X size={20} />
          </button>
        </div>

        <nav className="app-sidebar-nav">
          <span className="app-nav-section">Menü</span>
          {navLinks.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setIsNavOpen(false)}
              className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
            >
              <item.icon size={19} strokeWidth={1.9} aria-hidden="true" />
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

      {isNavOpen && <div className="app-backdrop" onClick={() => setIsNavOpen(false)} aria-hidden="true" />}

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-start">
            <button type="button" className="app-icon-button app-menu-button" onClick={() => setIsNavOpen(true)} aria-label="Menüyü aç">
              <Menu size={22} />
            </button>
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
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
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
            <button type="button" className="app-logout-button" onClick={() => void logout()}>
              <LogOut size={16} aria-hidden="true" />
              <span>Çıkış</span>
            </button>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>

        <BottomNav items={navLinks} onOpenMenu={() => setIsNavOpen(true)} />
      </div>
    </div>
  );
}
