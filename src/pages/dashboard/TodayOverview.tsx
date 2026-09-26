import { CreditCard, MoonStar, Plus, ReceiptText, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { reportApi, supplierApi, treasuryApi } from "../../api/moduleApis";
import { Money } from "../../components/ui/Money";
import { useAsyncData } from "../../hooks/useAsyncData";
import { startOfMonthIso, todayIso } from "../../lib/format";

async function loadOverview() {
  const today = todayIso();
  const [todayReport, monthReport, supplierDebt, treasury] = await Promise.all([
    reportApi.getPeriod(today, today),
    reportApi.getPeriod(startOfMonthIso(today), today),
    supplierApi.getTotalDebt(),
    treasuryApi.getSummary(),
  ]);
  return { todayReport, monthReport, supplierDebt, treasury };
}

function Amount({ value, signed }: { value: number | undefined; signed?: boolean }) {
  if (value === undefined) {
    return <span className="today-amount">…</span>;
  }
  const tone = signed ? (value < 0 ? " negative" : value > 0 ? " positive" : "") : "";
  return (
    <span className={`today-amount${tone}`}>
      <Money value={value} />
    </span>
  );
}

/** Panelin ana parçası: bugün ne oldu (tek büyük sayı), ne yapılacak (üç büyük düğme) ve ayın durumu. */
export function TodayOverview() {
  const { data } = useAsyncData(loadOverview);
  const t = data?.todayReport;
  const m = data?.monthReport;

  return (
    <>
      <section className="today-card" aria-label="Bugün">
        <div className="today-card-main">
          <span className="today-card-label">Bugün net</span>
          <Amount value={t?.netProfit} signed />
          <div className="today-card-split">
            <span>
              Gelir <Money value={t?.totalRevenue ?? 0} />
            </span>
            <span>
              Gider <Money value={t?.totalExpense ?? 0} />
            </span>
          </div>
        </div>
        <div className="today-actions">
          <Link to="/gun-sonu/satislar" className="today-action">
            <span className="today-action-icon">
              <Plus size={22} strokeWidth={2.4} aria-hidden="true" />
            </span>
            Satış gir
          </Link>
          <Link to="/finans/giderler" className="today-action">
            <span className="today-action-icon">
              <ReceiptText size={22} strokeWidth={2.2} aria-hidden="true" />
            </span>
            Gider ekle
          </Link>
          <Link to="/gun-sonu/kapanis" className="today-action">
            <span className="today-action-icon">
              <MoonStar size={22} strokeWidth={2.2} aria-hidden="true" />
            </span>
            Kapanış yap
          </Link>
        </div>
      </section>

      <section className="today-strip" aria-label="Bu ay ve kasa">
        <Link to="/raporlar/donem" className="today-tile">
          <span className="today-tile-label">Bu ay net kâr</span>
          <Amount value={m?.netProfit} signed />
          <span className="today-tile-note">Ay başından bugüne gelir − gider</span>
        </Link>
        <Link to="/finans/kasa" className="today-tile">
          <span className="today-tile-label">
            <Wallet size={15} aria-hidden="true" /> Nakit kasası
          </span>
          <Amount value={data?.treasury.cashBalance} signed />
          <span className="today-tile-note">Şu anki bakiye (tüm zamanlar)</span>
        </Link>
        <Link to="/finans/kasa" className="today-tile">
          <span className="today-tile-label">
            <CreditCard size={15} aria-hidden="true" /> Kart kasası
          </span>
          <Amount value={data?.treasury.bankBalance} signed />
          <span className="today-tile-note">Şu anki bakiye (tüm zamanlar)</span>
        </Link>
        <Link to="/mutfak/tedarikciler" className="today-tile">
          <span className="today-tile-label">Tedarikçi borcu</span>
          <Amount value={data?.supplierDebt} />
          <span className="today-tile-note">Ödenmemiş alışlar</span>
        </Link>
      </section>
    </>
  );
}
