import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="coming-soon-page">
      <h1>Sayfa bulunamadı</h1>
      <p>
        Aradığınız sayfa mevcut değil. <Link to="/">Panele dön</Link>.
      </p>
    </div>
  );
}
