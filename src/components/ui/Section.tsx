import type { ReactNode } from "react";
import "./ui.css";

interface SectionProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Sayfa içindeki beyaz kart bölümü (form, tablo vb. gruplamak için). */
export function Section({ title, actions, children }: SectionProps) {
  return (
    <section className="ui-section">
      {(title || actions) && (
        <div className="ui-section-header">
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
