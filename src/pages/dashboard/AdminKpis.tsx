import { Banknote, Coins, Landmark, Scale, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { reportApi, supplierApi, treasuryApi } from "../../api/moduleApis";
import { StatGrid, StatTile } from "../../components/ui/StatTile";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatMoney, startOfMonthIso, todayIso } from "../../lib/format";

async function loadKpis() {
  const today = todayIso();
  const [todayReport, monthReport, supplierDebt, treasury] = await Promise.all([
    reportApi.getPeriod(today, today),
    reportApi.getPeriod(startOfMonthIso(today), today),
    supplierApi.getTotalDebt(),
    treasuryApi.getSummary(),
  ]);
  return { todayReport, monthReport, supplierDebt, treasury };
}

/** İşletme sahibinin panelindeki özet göstergeler (bugün + bu ay + kasa bakiyeleri + tedarikçi borcu). */
export function AdminKpis() {
  const { data } = useAsyncData(loadKpis);
  const money = (value: number | undefined) => (value === undefined ? "…" : formatMoney(value));
  const monthNet = data?.monthReport.netProfit;

  return (
    <StatGrid>
      <StatTile icon={Coins} label="Bugünkü gelir" value={money(data?.todayReport.totalRevenue)} />
      <StatTile icon={Wallet} iconTone="rose" label="Bugünkü gider" value={money(data?.todayReport.totalExpense)} />
      <StatTile
        icon={monthNet !== undefined && monthNet < 0 ? TrendingDown : TrendingUp}
        iconTone={monthNet !== undefined && monthNet < 0 ? "rose" : "green"}
        label="Bu ay net kâr"
        value={money(monthNet)}
        tone={monthNet === undefined ? undefined : monthNet < 0 ? "negative" : "positive"}
      />
      <StatTile
        icon={Banknote}
        iconTone="green"
        label="Nakit kasası"
        value={money(data?.treasury.cashBalance)}
        tone={data && data.treasury.cashBalance < 0 ? "negative" : undefined}
      />
      <StatTile
        icon={Landmark}
        iconTone="teal"
        label="Kart kasası"
        value={money(data?.treasury.bankBalance)}
        tone={data && data.treasury.bankBalance < 0 ? "negative" : undefined}
      />
      <StatTile icon={Scale} iconTone="amber" label="Tedarikçi borcu" value={money(data?.supplierDebt)} />
    </StatGrid>
  );
}
