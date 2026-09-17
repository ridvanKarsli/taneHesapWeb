import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { NAV_ITEMS } from "../../config/navigation";
import { ROLE_LABELS } from "../../types/auth";
import "./DashboardPage.css";

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }

  const shortcuts = NAV_ITEMS.filter((item) => item.path !== "/" && item.roles.includes(user.role));

  return (
    <div>
      <h1>Merhaba, {user.fullName}</h1>
      <p className="dashboard-role">{ROLE_LABELS[user.role]} olarak giriş yaptınız.</p>

      <div className="dashboard-grid">
        {shortcuts.map((item) => (
          <Link key={item.path} to={item.path} className="dashboard-card">
            <span className="dashboard-card-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="dashboard-card-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
