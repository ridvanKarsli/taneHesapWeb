import { ClipboardCheck, Coins, Scale, Target, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { dailyClosingApi, dailySalesApi, ingredientApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { DateFilter } from "../../components/ui/DateFilter";
import { Money } from "../../components/ui/Money";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Section";
import { StatGrid, StatTile } from "../../components/ui/StatTile";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDate, formatNumber, todayIso } from "../../lib/format";
import type { DailyActualEntryDto, DailyLossReportDto } from "../../types/dailyClosing";
import type { ExpectedDaySummaryDto } from "../../types/dailySales";
import { ActualEntryForm, type ConsumptionDraft } from "./ActualEntryForm";
import "./modules.css";

interface ClosingData {
  expected: ExpectedDaySummaryDto;
  entry: DailyActualEntryDto | null;
  report: DailyLossReportDto | null;
}

async function loadClosingData(date: string): Promise<ClosingData> {
  const [expected, entry, report] = await Promise.all([
    dailySalesApi.getExpectedSummary(date),
    dailyClosingApi.getActualEntry(date),
    dailyClosingApi.getLossReport(date),
  ]);
  return { expected, entry, report };
}

/** Önceki kayıt varsa onu, yoksa reçeteye göre beklenen tüketimi forma ön doldurur. */
function toInitialRows({ expected, entry }: ClosingData): ConsumptionDraft[] {
  const expectedById = new Map(expected.expectedConsumption.map((c) => [c.ingredientId, c.expectedQuantity]));
  const rows: ConsumptionDraft[] = expected.expectedConsumption.map((c) => {
    const actual = entry?.consumptionItems.find((item) => item.ingredientId === c.ingredientId);
    return {
      ingredientId: c.ingredientId,
      expectedQuantity: c.expectedQuantity,
      actualQuantity: String(actual?.actualQuantityUsed ?? c.expectedQuantity),
    };
  });
  const extraRows = (entry?.consumptionItems ?? [])
    .filter((item) => !expectedById.has(item.ingredientId))
    .map((item) => ({ ingredientId: item.ingredientId, expectedQuantity: null, actualQuantity: String(item.actualQuantityUsed) }));
  return [...rows, ...extraRows];
}

/**
 * Gün sonu kapanışı: gerçekleşen gelir + gerçek tüketim girilir, stok kesinleşir ve beklenen ile
 * gerçek arasındaki fark (fire/kayıp) raporlanır (bkz. proje raporu 3.10). Yeniden gönderim desteklenir.
 */
export function DailyClosingPage() {
  const [date, setDate] = useState(todayIso());
  const ingredients = useAsyncData(ingredientApi.getAll);
  const closing = useAsyncData(() => loadClosingData(date), date);

  return (
    <div>
      <PageHeader
        description="Önce o günün satışlarını girin. Sonra kasadaki gerçek geliri ve sayıma göre gerçek tüketimi girip kapatın — sistem farkı raporlar."
        actions={<DateFilter id="closing-date" label="Tarih" value={date} onChange={setDate} />}
      />

      <AsyncState
        data={closing.data && ingredients.data ? { ...closing.data, ingredients: ingredients.data } : null}
        error={closing.error ?? ingredients.error}
        isLoading={closing.isLoading || ingredients.isLoading}
      >
        {(data) => (
          <>
            <Section title={`${formatDate(date)} — gerçekleşen değerler${data.entry ? " (kaydedildi, güncelleyebilirsiniz)" : ""}`} icon={ClipboardCheck}>
              <p className="ui-muted">Sistemin beklediği gelir: <Money value={data.expected.expectedRevenue} /></p>
              <ActualEntryForm
                key={`${date}-${data.entry?.id ?? "new"}`}
                date={date}
                ingredients={data.ingredients}
                initialRevenue={data.entry ? String(data.entry.actualRevenue) : ""}
                initialNote={data.entry?.note ?? ""}
                initialRows={toInitialRows(data)}
                onSubmit={async (request) => {
                  await dailyClosingApi.submitActualEntry(request);
                  await Promise.all([closing.reload(), ingredients.reload()]);
                }}
              />
            </Section>

            {data.report && <LossReport report={data.report} />}
          </>
        )}
      </AsyncState>
    </div>
  );
}

function LossReport({ report }: { report: DailyLossReportDto }) {
  const totalVarianceCost = report.items.reduce((sum, item) => sum + item.varianceCost, 0);

  return (
    <Section title="Fire / kayıp raporu" icon={TriangleAlert}>
      <StatGrid>
        <StatTile icon={Target} iconTone="slate" label="Beklenen gelir" value={<Money value={report.expectedRevenue} />} />
        <StatTile icon={Coins} label="Gerçekleşen gelir" value={<Money value={report.actualRevenue} />} />
        <StatTile
          icon={report.revenueVarianceAmount < 0 ? TrendingDown : TrendingUp}
          iconTone={report.revenueVarianceAmount < 0 ? "rose" : "green"}
          label="Gelir farkı"
          value={<Money value={report.revenueVarianceAmount} />}
          tone={report.revenueVarianceAmount < 0 ? "negative" : "positive"}
        />
        <StatTile
          icon={Scale}
          iconTone="amber"
          label="Malzeme fark maliyeti"
          value={<Money value={totalVarianceCost} />}
          tone={totalVarianceCost > 0 ? "negative" : "positive"}
        />
      </StatGrid>
      <p className="ui-muted">Pozitif fark: beklenenden fazla malzeme gitmiş (fire/kayıp). Negatif: beklenenden az.</p>
      <DataTable
        rows={report.items}
        rowKey={(item) => item.ingredientId}
        rowClassName={(item) => (item.varianceQuantity > 0 ? "warning" : undefined)}
        columns={[
          { header: "Malzeme", render: (item) => item.ingredientName },
          { header: "Beklenen", align: "right", render: (item) => `${formatNumber(item.expectedQuantity)} ${item.unit}` },
          { header: "Gerçek", align: "right", render: (item) => `${formatNumber(item.actualQuantity)} ${item.unit}` },
          {
            header: "Fark",
            align: "right",
            render: (item) => (
              <span className={item.varianceQuantity > 0 ? "ui-text-negative" : undefined}>
                {item.varianceQuantity > 0 ? "+" : ""}
                {formatNumber(item.varianceQuantity)} {item.unit}
              </span>
            ),
          },
          {
            header: "Fark maliyeti",
            align: "right",
            render: (item) => <span className={item.varianceCost > 0 ? "ui-text-negative" : undefined}><Money value={item.varianceCost} /></span>,
          },
        ]}
      />
    </Section>
  );
}
