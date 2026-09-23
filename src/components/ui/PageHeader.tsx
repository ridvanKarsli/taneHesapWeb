import type { ReactNode } from "react";
import { useNavGroup } from "../../layout/NavGroupContext";
import "./ui.css";

interface PageHeaderProps {
  /** Verilmezse `navigation.ts`'teki sayfa adı kullanılır (yalnızca sekmesiz sayfalarda görünür). */
  title?: string;
  /** Verilmezse `navigation.ts`'teki sayfa açıklaması kullanılır. */
  description?: string;
  actions?: ReactNode;
}

/**
 * Sayfa girişi. Büyük başlık ve ikon `GroupLayout` tarafından basılır; bu bileşen sekmeli sayfalarda
 * yalnızca açıklama + eylem düğmelerini (örn. "Yeni gider") gösterir, böylece başlık iki kez yazılmaz.
 */
export function PageHeader({ description, actions }: PageHeaderProps) {
  const nav = useNavGroup();
  const text = description ?? nav?.page.description;
  const showText = Boolean(text) && (nav?.isTabbed ?? true);

  if (!showText && !actions) {
    return null;
  }

  return (
    <div className="ui-page-intro">
      {showText && <p>{text}</p>}
      {actions && <div className="ui-page-header-actions">{actions}</div>}
    </div>
  );
}
