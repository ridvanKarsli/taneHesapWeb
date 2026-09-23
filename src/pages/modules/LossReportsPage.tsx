import { useState } from "react";
import { dailyClosingApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { DateFilter } from "../../components/ui/DateFilter";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Section";
import { useAsyncData } from "../../hooks/useAsyncData";
import { addDaysIso, formatDate, formatMoney, todayIso } from "../../lib/format";

/** Gün sonu kapanışlarından üretilen günlük fire/kayıp özetleri (bkz. proje raporu 3.10). */
export function LossReportsPage() {
  const [fromDate, setFromDate] = useState(addDaysIso(todayIso(), -29));
  const [toDate, setToDate] = useState(todayIso());
  const reports = useAsyncData(() => dailyClosingApi.getLossReports(fromDate, toDate), `${fromDate}|${toDate}`);

  return (
    <div>
      <PageHeader
        actions={
          <>
            <DateFilter id="loss-from" label="Başlangıç" value={fromDate} onChange={setFromDate} />
            <DateFilter id="loss-to" label="Bitiş" value={toDate} onChange={setToDate} />
          </>
        }
      />
      <Section>
        <AsyncState {...reports} isEmpty={(rows) => rows.length === 0} emptyText="Bu aralıkta gün sonu kapanışı yapılmamış.">
          {(rows) => (
            <DataTable
              rows={rows}
              rowKey={(row) => row.id}
              rowClassName={(row) => (row.revenueVarianceAmount < 0 || row.items.some((i) => i.varianceCost > 0) ? "warning" : undefined)}
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
                  header: "Fazla tüketim maliyeti",
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
