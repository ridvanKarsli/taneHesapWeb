import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="coming-soon-page">
        <span className="brand-mark" aria-hidden="true">
          <Compass size={28} />
        </span>
        <h1>Sayfa bulunamadı</h1>
        <p>
          Aradığınız sayfa mevcut değil. <Link to="/">Panele dön</Link>.
        </p>
      </div>
    </div>
  );
}
