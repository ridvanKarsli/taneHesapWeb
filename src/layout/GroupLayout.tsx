import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import type { NavGroup } from "../config/navigation";
import { NavGroupContext } from "./NavGroupContext";

interface GroupLayoutProps {
  group: NavGroup;
}

/**
 * Bir menü grubunun kabuğu: grup başlığı + (birden fazla sayfa varsa) sekmeler + aktif sayfa. Sekmeler
 * gerçek rotalardır (adres çubuğu sekmeyi yansıtır, geri tuşu çalışır). Sayfa açıklamaları
 * `navigation.ts`'ten gelir — sayfalar tekrar yazmaz.
 */
export function GroupLayout({ group }: GroupLayoutProps) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user) {
    return null;
  }

  const pages = group.pages.filter((page) => page.roles.includes(user.role));
  if (pages.length === 0) {
    return <Navigate to="/" replace />; // Rolün bu grupta hiç sayfası yok (adres elle yazılmış).
  }

  const page = pages.find((p) => p.path === pathname) ?? pages[0];
  const isTabbed = pages.length > 1;
  const Icon = group.icon;

  return (
    <NavGroupContext.Provider value={{ group, page, isTabbed }}>
      <header className="ui-page-header">
        <div className="ui-page-header-main">
          <span className={`tone-badge tone-${group.tone} ui-page-header-icon`} aria-hidden="true">
            <Icon size={22} strokeWidth={1.9} />
          </span>
          <div>
            <h1>{isTabbed ? group.label : page.label}</h1>
            {!isTabbed && page.description && <p>{page.description}</p>}
          </div>
        </div>
        {isTabbed && (
          <nav className="ui-tabs" aria-label={`${group.label} sekmeleri`}>
            {pages.map((p) => (
              <NavLink key={p.path} to={p.path} className={({ isActive }) => (isActive ? "ui-tab active" : "ui-tab")}>
                {p.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <Outlet />
    </NavGroupContext.Provider>
  );
}
