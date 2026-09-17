interface ComingSoonPageProps {
  title: string;
  icon: string;
}

/**
 * `config/navigation.ts`'teki modüllerden henüz sayfası yazılmamış olanlar için tek, paylaşılan
 * yer tutucu. Her modül için neredeyse aynı olan 10+ ayrı bileşen yazmak yerine (bloat/tekrar),
 * gezinme yapısı burada tek noktadan sağlanır; gerçek sayfa yazıldığında sadece ilgili route
 * `AppRoutes.tsx`'te bu bileşenden gerçek sayfaya değiştirilir.
 */
export function ComingSoonPage({ title, icon }: ComingSoonPageProps) {
  return (
    <div className="coming-soon-page">
      <span className="coming-soon-page-icon" aria-hidden="true">
        {icon}
      </span>
      <h1>{title}</h1>
      <p>Bu modülün arayüzü henüz eklenmedi. Backend API'si hazır (bkz. proje raporu bölüm 10).</p>
    </div>
  );
}
