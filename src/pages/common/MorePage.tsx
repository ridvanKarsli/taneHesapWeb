import { ChevronRight, LogOut, Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { visibleGroups } from "../../config/navigation";
import { MAX_BOTTOM_TABS, initialsOf } from "../../layout/navigationShell";
import { useTheme } from "../../theme/useTheme";
import { ROLE_LABELS } from "../../types/auth";
import "./MorePage.css";

/**
 * Mobildeki "Daha fazla" sekmesi: alt çubuğa sığmayan gruplar, hesap kartı, tema ve çıkış. Masaüstünde
 * kenar çubuğu her şeyi zaten gösterir; bu sayfa yine de adresle açılabilir (zararsız).
 */
export function MorePage() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  if (!user) {
    return null;
  }

  const groups = visibleGroups(user.role).slice(MAX_BOTTOM_TABS);

  return (
    <div className="more-page">
      <section className="more-account">
        <span className="app-user-avatar more-avatar" aria-hidden="true">
          {initialsOf(user.fullName)}
        </span>
        <div>
          <strong>{user.fullName}</strong>
          <span>{ROLE_LABELS[user.role]}</span>
        </div>
      </section>

      {groups.length > 0 && (
        <section className="more-list" aria-label="Diğer bölümler">
          {groups.map((group) => {
            const single = group.pages.length === 1;
            return (
              <Link key={group.path} to={single ? group.pages[0].path : group.path} className="more-row">
                <span className={`tone-badge tone-${group.tone} more-row-icon`} aria-hidden="true">
                  <group.icon size={22} strokeWidth={2} />
                </span>
                <span className="more-row-text">
                  <strong>{single ? group.pages[0].label : group.label}</strong>
                  <span>{single ? group.description : group.pages.map((p) => p.label).join(" · ")}</span>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            );
          })}
        </section>
      )}

      <section className="more-list" aria-label="Ayarlar">
        <button type="button" className="more-row" onClick={toggle}>
          <span className="tone-badge tone-slate more-row-icon" aria-hidden="true">
            {theme === "dark" ? <Sun size={22} strokeWidth={2} /> : <Moon size={22} strokeWidth={2} />}
          </span>
          <span className="more-row-text">
            <strong>{theme === "dark" ? "Açık tema" : "Koyu tema"}</strong>
            <span>Görünümü değiştir</span>
          </span>
        </button>
        <button type="button" className="more-row" onClick={() => void logout()}>
          <span className="tone-badge tone-rose more-row-icon" aria-hidden="true">
            <LogOut size={22} strokeWidth={2} />
          </span>
          <span className="more-row-text">
            <strong>Çıkış yap</strong>
            <span>Bu cihazdaki oturumu kapat</span>
          </span>
        </button>
      </section>
    </div>
  );
}
