import type { NavItem } from "../../config/navigation";

interface ComingSoonPageProps {
  item: NavItem;
}

/**
 * `routes/AppRoutes.tsx`'teki `PAGE_COMPONENTS` eşlemesinde karşılığı olmayan (yeni eklenmiş) bir
 * modül için güvenli varsayılan yer tutucu.
 */
export function ComingSoonPage({ item }: ComingSoonPageProps) {
  return (
    <div className="coming-soon-page">
      <span className={`tone-badge tone-${item.tone}`} aria-hidden="true">
        <item.icon size={26} />
      </span>
      <h1>{item.label}</h1>
      <p>Bu modülün arayüzü henüz eklenmedi.</p>
    </div>
  );
}
