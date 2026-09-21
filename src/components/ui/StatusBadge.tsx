import "./ui.css";

interface StatusBadgeProps {
  tone: "success" | "danger" | "warning" | "neutral";
  children: string;
}

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return <span className={`ui-badge ${tone}`}>{children}</span>;
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return <StatusBadge tone={isActive ? "success" : "neutral"}>{isActive ? "Aktif" : "Pasif"}</StatusBadge>;
}
