import type { ReactNode } from "react";
import "./ui.css";

interface PageHeaderProps {
  icon?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ icon, title, description, actions }: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      <div>
        <h1>
          {icon && (
            <span className="ui-page-header-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          {title}
        </h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="ui-page-header-actions">{actions}</div>}
    </header>
  );
}
