import { Banknote, Bike, Coins, CreditCard, PieChart, Store, TrendingDown, TrendingUp, UtensilsCrossed, Wallet } from "lucide-react";
import { useState } from "react";
import { reportApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { DateFilter } from "../../components/ui/DateFilter";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Section";
import { StatGrid, StatTile } from "../../components/ui/StatTile";
import { useAsyncData } from "../../hooks/useAsyncData";
import { addDaysIso, formatMoney, startOfMonthIso, startOfWeekIso, todayIso } from "../../lib/format";
import { EXPENSE_CATEGORY_LABELS } from "../../types/enums";

interface Range {
  fromDate: string;
  toDate: string;
}

const today = todayIso();
const PRESETS: { label: string; range: Range }[] = [
  { label: "Bugün", range: { fromDate: today, toDate: today } },
  { label: "Dün", range: { fromDate: addDaysIso(today, -1), toDate: addDaysIso(today, -1) } },
  { label: "Bu hafta", range: { fromDate: startOfWeekIso(today), toDate: today } },
  { label: "Bu ay", range: { fromDate: startOfMonthIso(today), toDate: today } },
  { label: "Son 30 gün", range: { fromDate: addDaysIso(today, -29), toDate: today } },
];

/** Seçili aralıkta gelir-gider raporu: nakit/kart, kanal, kategori, platform ve tabak kırılımı (bkz. proje raporu 3.14, 3.11). */
export function PeriodReportPage() {
  const [range, setRange] = useState<Range>(PRESETS[3].range);
  const report = useAsyncData(() => reportApi.getPeriod(range.fromDate, range.toDate), `${range.fromDate}|${range.toDate}`);

  return (
    <div>
      <PageHeader
        actions={
          <>
            <div className="ui-chip-group" role="group" aria-label="Hazır aralıklar">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={`ui-button small ${preset.range.fromDate === range.fromDate && preset.range.toDate === range.toDate ? "" : "ghost"}`}
                  onClick={() => setRange(preset.range)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <DateFilter id="report-from" label="Başlangıç" value={range.fromDate} onChange={(fromDate) => setRange((r) => ({ ...r, fromDate }))} />
            <DateFilter id="report-to" label="Bitiş" value={range.toDate} onChange={(toDate) => setRange((r) => ({ ...r, toDate }))} />
          </>
        }
      />

      <AsyncState {...report}>
        {(data) => (
          <>
            <StatGrid>
              <StatTile icon={Coins} label="Toplam gelir" value={formatMoney(data.totalRevenue)} />
              <StatTile icon={Wallet} iconTone="rose" label="Toplam gider" value={formatMoney(data.totalExpense)} />
              <StatTile
                icon={data.netProfit < 0 ? TrendingDown : TrendingUp}
                iconTone={data.netProfit < 0 ? "rose" : "green"}
                label="Net kâr"
                value={formatMoney(data.netProfit)}
                tone={data.netProfit < 0 ? "negative" : "positive"}
              />
              <StatTile icon={Banknote} iconTone="green" label="Nakit gelir" value={formatMoney(data.cashRevenue)} />
              <StatTile icon={CreditCard} iconTone="blue" label="Kart gelir" value={formatMoney(data.cardRevenue)} />
              <StatTile icon={Store} iconTone="amber" label="Dükkan içi" value={formatMoney(data.inStoreRevenue)} />
              <StatTile icon={Bike} iconTone="violet" label="Paket servis" value={formatMoney(data.platformRevenue)} />
            </StatGrid>

            <div className="ui-two-columns">
              <Section title="Gider kategorileri" icon={PieChart}>
                {data.expenseByCategory.length === 0 ? (
                  <p className="ui-muted">Bu aralıkta gider yok.</p>
                ) : (
                  <DataTable
                    rows={data.expenseByCategory}
                    rowKey={(row) => String(row.category)}
                    columns={[
                      { header: "Kategori", render: (row) => EXPENSE_CATEGORY_LABELS[row.category] ?? "Diğer" },
                      { header: "Tutar", align: "right", render: (row) => formatMoney(row.amount) },
                    ]}
                  />
                )}
              </Section>

              <Section title="Platform gelirleri" icon={Bike}>
                {data.revenueByPlatform.length === 0 ? (
                  <p className="ui-muted">Bu aralıkta paket servis satışı yok.</p>
                ) : (
                  <DataTable
                    rows={data.revenueByPlatform}
                    rowKey={(row) => row.platformId}
                    columns={[
                      { header: "Platform", render: (row) => row.platformName },
                      { header: "Brüt", align: "right", render: (row) => formatMoney(row.grossRevenue) },
                      { header: "Komisyon", align: "right", render: (row) => formatMoney(row.commissionAmount) },
                      { header: "Net", align: "right", render: (row) => formatMoney(row.netRevenue) },
                    ]}
                  />
                )}
              </Section>
            </div>

            <Section title="Tabak bazlı satış ve kârlılık" icon={UtensilsCrossed}>
              {data.salesByDish.length === 0 ? (
                <p className="ui-muted">Bu aralıkta satış yok.</p>
              ) : (
                <>
                  <p className="ui-muted">Maliyet, reçete × malzemelerin güncel birim fiyatıyla hesaplanan tahmini değerdir.</p>
                  <DataTable
                    rows={data.salesByDish}
                    rowKey={(row) => row.dishSizeId}
                    columns={[
                      { header: "Ürün", render: (row) => <span className="ui-cell-strong">{`${row.dishName} — ${row.sizeName}`}</span> },
                      { header: "Adet", align: "right", render: (row) => String(row.quantity) },
                      { header: "Ciro", align: "right", render: (row) => formatMoney(row.revenue) },
                      { header: "Tahmini maliyet", align: "right", render: (row) => formatMoney(row.estimatedCost) },
                      {
                        header: "Tahmini kâr",
                        align: "right",
                        render: (row) => (
                          <span className={row.estimatedProfit < 0 ? "ui-text-negative" : "ui-text-positive"}>{formatMoney(row.estimatedProfit)}</span>
                        ),
                      },
                    ]}
                  />
                </>
              )}
            </Section>
          </>
        )}
      </AsyncState>
    </div>
  );
}
