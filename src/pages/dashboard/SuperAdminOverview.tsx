import { Building2, LogIn, Plus, Settings2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { businessApi } from "../../api/businessApi";
import { useAuth } from "../../auth/useAuth";
import { AsyncState } from "../../components/ui/AsyncState";
import { useAsyncData } from "../../hooks/useAsyncData";
import type { BusinessDto } from "../../types/business";

/** Süper yöneticinin paneli: işletmeler tek dokunuşla — "İşletmeye gir" ile sahibi gibi çalış, "Yönet" ile yönetici ata. */
export function SuperAdminOverview() {
  const businesses = useAsyncData(businessApi.getAll);
  const { enterBusiness } = useAuth();
  const navigate = useNavigate();

  async function enter(business: BusinessDto) {
    await enterBusiness(business.id);
    navigate("/");
  }

  const active = (businesses.data ?? []).filter((b) => b.isActive).length;

  return (
    <>
      <section className="today-card" aria-label="İşletmeler">
        <div className="today-card-main">
          <span className="today-card-label">
            <Building2 size={15} aria-hidden="true" /> Aktif işletme
          </span>
          <span className="today-amount">{businesses.data ? active : "…"}</span>
          <div className="today-card-split">
            <span>Bir işletmeye girince her şeyi sahibi gibi görür ve yaparsınız.</span>
          </div>
        </div>
        <div className="today-actions today-actions-two">
          <Link to="/isletmeler" className="today-action">
            <span className="today-action-icon">
              <Plus size={22} strokeWidth={2.4} aria-hidden="true" />
            </span>
            Yeni işletme
          </Link>
          <Link to="/tanimlar/denetim" className="today-action">
            <span className="today-action-icon">
              <Settings2 size={22} strokeWidth={2.2} aria-hidden="true" />
            </span>
            Denetim kayıtları
          </Link>
        </div>
      </section>

      <AsyncState {...businesses} isEmpty={(rows) => rows.length === 0} emptyText="Henüz işletme yok — İşletmeler sayfasından ekleyin.">
        {(rows) => (
          <section className="business-list" aria-label="İşletmeler">
            {rows.map((business) => (
              <article key={business.id} className={`business-row${business.isActive ? "" : " passive"}`}>
                <span className="tone-badge tone-saffron business-row-icon" aria-hidden="true">
                  <Building2 size={22} strokeWidth={2} />
                </span>
                <span className="business-row-text">
                  <strong>{business.name}</strong>
                  <span>{business.isActive ? (business.address || "Aktif") : "Pasif"}</span>
                </span>
                <span className="business-row-actions">
                  {business.isActive && (
                    <button type="button" className="ui-button small" onClick={() => void enter(business)}>
                      <LogIn size={14} aria-hidden="true" />
                      İşletmeye gir
                    </button>
                  )}
                  <Link to="/isletmeler" className="ui-button secondary small">
                    Yönet
                  </Link>
                </span>
              </article>
            ))}
          </section>
        )}
      </AsyncState>
    </>
  );
}
