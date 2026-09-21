import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { findNavItem } from "../../config/navigation";
import "./ui.css";

interface PageHeaderProps {
  /** Verilmezse `navigation.ts`'teki modül adı kullanılır. */
  title?: string;
  description?: string;
  actions?: ReactNode;
}

/**
 * Sayfa başlığı. İkon ve renk tonu mevcut rotaya karşılık gelen `NavItem`'dan alınır — her sayfa
 * kendi ikonunu ayrıca tanımlamaz (tek kaynak: `config/navigation.ts`).
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const { pathname } = useLocation();
  const navItem = findNavItem(pathname);
  const Icon = navItem?.icon;

  return (
    <header className="ui-page-header">
      <div className="ui-page-header-main">
        {Icon && (
          <span className={`tone-badge tone-${navItem.tone} ui-page-header-icon`} aria-hidden="true">
            <Icon size={22} strokeWidth={1.9} />
          </span>
        )}
        <div>
          <h1>{title ?? navItem?.label}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>
      {actions && <div className="ui-page-header-actions">{actions}</div>}
    </header>
  );
}
