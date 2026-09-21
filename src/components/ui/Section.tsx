import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import "./ui.css";

interface SectionProps {
  title?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
}

/** Sayfa içindeki beyaz kart bölümü (form, tablo vb. gruplamak için). */
export function Section({ title, icon: Icon, actions, children }: SectionProps) {
  return (
    <section className="ui-section">
      {(title || actions) && (
        <div className="ui-section-header">
          {title && (
            <h2>
              {Icon && <Icon size={18} aria-hidden="true" />}
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
