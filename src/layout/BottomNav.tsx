import { LayoutGrid, type LucideIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import type { NavTone } from "../config/navigation";
import { MAX_BOTTOM_TABS, MORE_PATH } from "./navigationShell";

export interface BottomNavItem {
  key: string;
  to: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  tone: NavTone;
}

interface BottomNavProps {
  items: BottomNavItem[];
}

/** Alt çubuğa sığmayan gruplar (Daha fazla sayfası bunları listeler). */
function overflowItems(items: BottomNavItem[]): BottomNavItem[] {
  return items.length > MAX_BOTTOM_TABS ? items.slice(MAX_BOTTOM_TABS) : [];
}

/**
 * Mobil (≤ 960px) alt sekme çubuğu — tek gezinme aracı; çekmece menü yoktur. İlk dört grup sekme olarak,
 * kalanlar "Daha fazla" sayfasında (gerçek rota: geri tuşu çalışır). Aktiflik, adresin grup yoluyla başlamasıdır.
 */
export function BottomNav({ items }: BottomNavProps) {
  const { pathname } = useLocation();
  const overflow = overflowItems(items);
  const visible = overflow.length > 0 ? items.slice(0, MAX_BOTTOM_TABS) : items;
  const moreActive = pathname.startsWith(MORE_PATH) || overflow.some((item) => pathname.startsWith(item.key));

  return (
    <nav className="app-bottom-nav" aria-label="Alt menü">
      {visible.map((item) => {
        const isActive = item.to === "/" ? pathname === "/" : pathname.startsWith(item.key);
        return (
          <NavLink key={item.key} to={item.to} className={`app-bottom-tab${isActive ? " active" : ""}`} aria-current={isActive ? "page" : undefined}>
            <span className="app-bottom-tab-icon">
              <item.icon size={22} strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
            </span>
            <span>{item.shortLabel}</span>
          </NavLink>
        );
      })}
      {overflow.length > 0 && (
        <NavLink to={MORE_PATH} className={`app-bottom-tab${moreActive ? " active" : ""}`} aria-current={moreActive ? "page" : undefined}>
          <span className="app-bottom-tab-icon">
            <LayoutGrid size={22} strokeWidth={moreActive ? 2.4 : 2} aria-hidden="true" />
          </span>
          <span>Daha fazla</span>
        </NavLink>
      )}
    </nav>
  );
}
