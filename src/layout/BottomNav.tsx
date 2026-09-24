import { Menu, type LucideIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

export interface BottomNavItem {
  key: string;
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

interface BottomNavProps {
  items: BottomNavItem[];
  onOpenMenu: () => void;
}

/** Alt çubukta en fazla bu kadar sekme; kalanlar "Menü" çekmecesinden açılır. */
const MAX_TABS = 4;

/**
 * Mobil (≤ 960px) alt sekme çubuğu — ana ekrana eklenmiş uygulamada yerel uygulama hissi. İlk dört grup
 * sekme olarak, kalan gruplar "Menü" ile; her grup için aktiflik, adres o grubun yolu ile başlıyorsa.
 */
export function BottomNav({ items, onOpenMenu }: BottomNavProps) {
  const { pathname } = useLocation();
  const needsMenu = items.length > MAX_TABS;
  const visible = needsMenu ? items.slice(0, MAX_TABS) : items;

  return (
    <nav className="app-bottom-nav" aria-label="Alt menü">
      {visible.map((item) => {
        const isActive = item.to === "/" ? pathname === "/" : pathname.startsWith(item.key);
        return (
          <NavLink key={item.key} to={item.to} className={`app-bottom-tab${isActive ? " active" : ""}`} aria-current={isActive ? "page" : undefined}>
            <item.icon size={22} strokeWidth={isActive ? 2.3 : 1.9} aria-hidden="true" />
            <span>{item.shortLabel}</span>
          </NavLink>
        );
      })}
      {needsMenu && (
        <button type="button" className="app-bottom-tab" onClick={onOpenMenu}>
          <Menu size={22} strokeWidth={1.9} aria-hidden="true" />
          <span>Menü</span>
        </button>
      )}
    </nav>
  );
}
