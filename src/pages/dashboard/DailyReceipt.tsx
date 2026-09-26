import { reportApi, supplierApi, treasuryApi } from "../../api/moduleApis";
import { useAsyncData } from "../../hooks/useAsyncData";
import { Money } from "../../components/ui/Money";
import { formatDate, startOfMonthIso, todayIso } from "../../lib/format";

async function loadReceipt() {
  const today = todayIso();
  const [todayReport, monthReport, supplierDebt, treasury] = await Promise.all([
    reportApi.getPeriod(today, today),
    reportApi.getPeriod(startOfMonthIso(today), today),
    supplierApi.getTotalDebt(),
    treasuryApi.getSummary(),
  ]);
  return { today, todayReport, monthReport, supplierDebt, treasury };
}

interface LineProps {
  label: string;
  value: number | undefined;
  strong?: boolean;
  signed?: boolean;
}

function Line({ label, value, strong, signed }: LineProps) {
  const tone = signed && value !== undefined ? (value < 0 ? "negative" : value > 0 ? "positive" : "") : "";
  return (
    <div className={`receipt-line${strong ? " strong" : ""}`}>
      <span className="receipt-label">{label}</span>
      <span className="receipt-dots" aria-hidden="true" />
      <span className={`receipt-value ${tone}`}>{value === undefined ? "…" : <Money value={value} />}</span>
    </div>
  );
}

/**
 * Panelin ana parçası: günün fişi. Bir adisyon gibi okunur — bugünün geliri, gideri, net; ardından ayın
 * durumu ve kasa. Sayılar Fraunces ile, etiketler noktalı çizgiyle tutara bağlanır (bkz. index.css .money).
 */
export function DailyReceipt() {
  const { data } = useAsyncData(loadReceipt);
  const t = data?.todayReport;
  const m = data?.monthReport;

  return (
    <section className="receipt" aria-label="Günün fişi">
      <header className="receipt-head">
        <h2>Günün fişi</h2>
        <span>{formatDate(data?.today ?? todayIso())}</span>
      </header>

      <div className="receipt-block">
        <Line label="Gelir" value={t?.totalRevenue} />
        <Line label="Gider" value={t?.totalExpense} />
        <Line label="Net" value={t?.netProfit} strong signed />
      </div>

      <div className="receipt-block">
        <Line label="Bu ay net kâr" value={m?.netProfit} signed />
        <Line label="Nakit kasası" value={data?.treasury.cashBalance} signed />
        <Line label="Kart kasası" value={data?.treasury.bankBalance} signed />
        <Line label="Tedarikçi borcu" value={data?.supplierDebt} />
      </div>

      <footer className="receipt-foot">Bugün girilen satış ve giderlere göre. Kasa bakiyeleri tüm hareketlerin toplamıdır.</footer>
    </section>
  );
}
