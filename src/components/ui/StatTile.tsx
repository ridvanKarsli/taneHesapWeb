import type { ReactNode } from "react";
import "./ui.css";

interface StatTileProps {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}

export function StatTile({ label, value, tone }: StatTileProps) {
  return (
    <div className="ui-stat-tile">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="ui-stat-grid">{children}</div>;
}
