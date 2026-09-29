import { Clock3, ReceiptText, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { myWalletApi } from "../../api/moduleApis";
import { Money } from "../../components/ui/Money";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDate, formatNumber, startOfMonthIso, todayIso } from "../../lib/format";
import { walletStanding } from "../../lib/walletStanding";

/** Çalışanın paneli: cüzdan bakiyesi (işletmenin ona borcu), bu ayki saatler ve iki büyük eylem. */
export function EmployeeOverview() {
  const { data } = useAsyncData(myWalletApi.get);
  const monthStart = startOfMonthIso(todayIso());
  const monthLogs = (data?.workLogs ?? []).filter((log) => log.workDate >= monthStart);
  const monthHours = monthLogs.reduce((sum, log) => sum + log.hours, 0);
  const monthEarned = monthLogs.reduce((sum, log) => sum + log.amount, 0);
  // Ödemeler en yeniden eskiye gelir.
  const lastPayment = data?.payments[0] ?? null;

  return (
    <>
      <section className="today-card" aria-label="Cüzdanım">
        <div className="today-card-main">
          <span className="today-card-label">
            <Wallet size={15} aria-hidden="true" /> Cüzdanım{data && ` — ${walletStanding(data.balance).label}`}
          </span>
          {data ? (
            <span className={`today-amount${walletStanding(data.balance).tone ? ` ${walletStanding(data.balance).tone}` : ""}`}>
              <Money value={walletStanding(data.balance).amount} />
            </span>
          ) : (
            <span className="today-amount">…</span>
          )}
          <div className="today-card-split">
            <span>
              Hak ediş <Money value={data?.totalEarned ?? 0} />
            </span>
            <span>
              Ödenen <Money value={data?.totalPaid ?? 0} />
            </span>
          </div>
        </div>
        <div className="today-actions today-actions-two">
          <Link to="/finans/giderler" className="today-action">
            <span className="today-action-icon">
              <ReceiptText size={22} strokeWidth={2.2} aria-hidden="true" />
            </span>
            Gider ekle
          </Link>
          <Link to="/finans/cuzdanim" className="today-action">
            <span className="today-action-icon">
              <Wallet size={22} strokeWidth={2.2} aria-hidden="true" />
            </span>
            Cüzdanım
          </Link>
        </div>
      </section>

      <section className="today-strip today-strip-three" aria-label="Bu ay">
        <div className="today-tile">
          <span className="today-tile-label">
            <Clock3 size={15} aria-hidden="true" /> Bu ay çalışılan
          </span>
          <span className="today-amount">{data ? `${formatNumber(monthHours)} saat` : "…"}</span>
        </div>
        <div className="today-tile">
          <span className="today-tile-label">Bu ay hak ediş</span>
          <span className="today-amount">{data ? <Money value={monthEarned} /> : "…"}</span>
        </div>
        <div className="today-tile">
          <span className="today-tile-label">Son ödeme</span>
          <span className="today-amount">{data ? lastPayment ? <Money value={lastPayment.amount} /> : "—" : "…"}</span>
          {lastPayment && <span className="today-tile-note">{formatDate(lastPayment.date)}</span>}
        </div>
      </section>
    </>
  );
}
