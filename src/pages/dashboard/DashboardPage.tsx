import { ChevronRight, Wheat } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { visibleGroups } from "../../config/navigation";
import { ROLE_LABELS, UserRole } from "../../types/auth";
import { AdminAlerts } from "./AdminAlerts";
import { AdminKpis } from "./AdminKpis";
import "./DashboardPage.css";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }

  const shortcuts = visibleGroups(user.role)
    .filter((group) => group.path !== "/")
    .map((group) => ({
      ...group,
      to: group.pages.length === 1 ? group.pages[0].path : group.path,
      label: group.pages.length === 1 ? group.pages[0].label : group.label,
      description: group.pages.length === 1 ? (group.pages[0].description ?? group.description) : group.pages.map((p) => p.label).join(" · "),
    }));
  const firstName = user.fullName.split(" ")[0];

  return (
    <div className="dashboard">
      <section className="dashboard-hero">
        <div>
          <span className="dashboard-role-chip">{ROLE_LABELS[user.role]}</span>
          <h1>
            {greeting()}, {firstName}
          </h1>
          <p>Bugün işletmende neler olup bittiğine hızlıca göz at.</p>
        </div>
        <Wheat className="dashboard-hero-art" size={132} strokeWidth={1.1} aria-hidden="true" />
      </section>

      {user.role === UserRole.Admin && (
        <>
          <AdminKpis />
          <AdminAlerts />
        </>
      )}

      <h2 className="dashboard-section-title">Hızlı erişim</h2>
      <div className="dashboard-grid">
        {shortcuts.map((item) => (
          <Link key={item.path} to={item.to} className="dashboard-card">
            <span className={`tone-badge tone-${item.tone} dashboard-card-icon`} aria-hidden="true">
              <item.icon size={22} strokeWidth={1.9} />
            </span>
            <span className="dashboard-card-text">
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </span>
            <ChevronRight className="dashboard-card-arrow" size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}
