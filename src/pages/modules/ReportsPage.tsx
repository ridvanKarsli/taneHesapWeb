import { useState } from "react";
import { dailyClosingApi, reportApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { DateFilter } from "../../components/ui/DateFilter";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Section";
import { StatGrid, StatTile } from "../../components/ui/StatTile";
import { useAsyncData } from "../../hooks/useAsyncData";
import { addDaysIso, formatDate, formatMoney, startOfMonthIso, startOfWeekIso, todayIso } from "../../lib/format";
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

/** Günlük/haftalık/aylık gelir-gider raporu, nakit/kart ve kanal kırılımıyla (bkz. proje raporu 3.14, 3.10). */
export function ReportsPage() {
  const [range, setRange] = useState<Range>(PRESETS[3].range);
  const rangeKey = `${range.fromDate}|${range.toDate}`;
  const report = useAsyncData(() => reportApi.getPeriod(range.fromDate, range.toDate), rangeKey);
  const lossReports = useAsyncData(() => dailyClosingApi.getLossReports(range.fromDate, range.toDate), rangeKey);

  return (
    <div>
      <PageHeader
        icon="📊"
        title="Raporlar"
        actions={
          <>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`ui-button small ${preset.range.fromDate === range.fromDate && preset.range.toDate === range.toDate ? "" : "secondary"}`}
                onClick={() => setRange(preset.range)}
              >
                {preset.label}
              </button>
            ))}
            <DateFilter id="report-from" label="Başlangıç" value={range.fromDate} onChange={(fromDate) => setRange((r) => ({ ...r, fromDate }))} />
            <DateFilter id="report-to" label="Bitiş" value={range.toDate} onChange={(toDate) => setRange((r) => ({ ...r, toDate }))} />
          </>
        }
      />

      <AsyncState {...report}>
        {(data) => (
          <>
            <StatGrid>
              <StatTile label="Toplam gelir" value={formatMoney(data.totalRevenue)} />
              <StatTile label="Toplam gider" value={formatMoney(data.totalExpense)} />
              <StatTile label="Net kâr" value={formatMoney(data.netProfit)} tone={data.netProfit < 0 ? "negative" : "positive"} />
              <StatTile label="Nakit gelir" value={formatMoney(data.cashRevenue)} />
              <StatTile label="Kart gelir" value={formatMoney(data.cardRevenue)} />
              <StatTile label="Dükkan içi" value={formatMoney(data.inStoreRevenue)} />
              <StatTile label="Paket servis" value={formatMoney(data.platformRevenue)} />
            </StatGrid>

            <div className="ui-two-columns">
              <Section title="Gider kategorileri">
                {data.expenseByCategory.length === 0 ? (
                  <p className="ui-muted">Bu aralıkta gider yok.</p>
                ) : (
                  <DataTable
                    rows={data.expenseByCategory}
                    rowKey={(row) => String(row.category)}
                    columns={[
                      { header: "Kategori", render: (row) => EXPENSE_CATEGORY_LABELS[row.category] },
                      { header: "Tutar", align: "right", render: (row) => formatMoney(row.amount) },
                    ]}
                  />
                )}
              </Section>

              <Section title="Platform gelirleri">
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
          </>
        )}
      </AsyncState>

      <Section title="Günlük fire / kayıp özetleri">
        <AsyncState {...lossReports} isEmpty={(rows) => rows.length === 0} emptyText="Bu aralıkta gün sonu kapanışı yapılmamış.">
          {(rows) => (
            <DataTable
              rows={rows}
              rowKey={(row) => row.id}
              columns={[
                { header: "Tarih", render: (row) => formatDate(row.reportDate) },
                { header: "Beklenen gelir", align: "right", render: (row) => formatMoney(row.expectedRevenue) },
                { header: "Gerçek gelir", align: "right", render: (row) => formatMoney(row.actualRevenue) },
                {
                  header: "Gelir farkı",
                  align: "right",
                  render: (row) => (
                    <span className={row.revenueVarianceAmount < 0 ? "ui-text-negative" : "ui-text-positive"}>{formatMoney(row.revenueVarianceAmount)}</span>
                  ),
                },
                {
                  header: "Malzeme fark maliyeti",
                  align: "right",
                  render: (row) => {
                    const cost = row.items.reduce((sum, item) => sum + item.varianceCost, 0);
                    return <span className={cost > 0 ? "ui-text-negative" : undefined}>{formatMoney(cost)}</span>;
                  },
                },
              ]}
            />
          )}
        </AsyncState>
      </Section>
    </div>
  );
}
