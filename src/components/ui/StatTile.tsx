import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { NavTone } from "../../config/navigation";
import { MoneyText } from "./Money";
import "./ui.css";

interface StatTileProps {
  label: string;
  value: string | ReactNode;
  tone?: "positive" | "negative";
  icon?: LucideIcon;
  iconTone?: NavTone;
}

export function StatTile({ label, value, tone, icon: Icon, iconTone = "saffron" }: StatTileProps) {
  return (
    <div className="ui-stat-tile">
      {Icon && (
        <span className={`tone-badge tone-${iconTone}`} aria-hidden="true">
          <Icon size={20} strokeWidth={1.9} />
        </span>
      )}
      <div className="ui-stat-tile-body">
        <span>{label}</span>
        <strong className={tone}>{typeof value === "string" ? <MoneyText text={value} /> : value}</strong>
      </div>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="ui-stat-grid">{children}</div>;
}
