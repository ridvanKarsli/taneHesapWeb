import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { NotificationsBell } from "../components/NotificationsBell";
import { NAV_ITEMS } from "../config/navigation";
import { ROLE_LABELS } from "../types/auth";
import "./AppLayout.css";

export function AppLayout() {
  const { user, logout } = useAuth();

  if (!user) {
    // RequireAuth bu duruma girmeden yönlendirir; TypeScript için erken çıkış.
    return null;
  }

  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const initials = user.fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-brand">
          <span className="app-sidebar-brand-mark" aria-hidden="true">
            🌾
          </span>
          <span>taneHesap</span>
        </div>
        <nav className="app-sidebar-nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
            >
              <span className="app-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-user">
            <span className="app-user-avatar" aria-hidden="true">
              {initials}
            </span>
            <div>
              <strong>{user.fullName}</strong>
              <span className="app-role-badge">{ROLE_LABELS[user.role]}</span>
            </div>
          </div>
          <div className="app-topbar-actions">
            <NotificationsBell />
            <button type="button" onClick={() => void logout()}>
              Çıkış yap
            </button>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
