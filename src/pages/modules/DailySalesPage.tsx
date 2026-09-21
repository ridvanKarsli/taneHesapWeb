import { useState } from "react";
import { dailySalesApi, dishApi, platformApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Section";
import { StatGrid, StatTile } from "../../components/ui/StatTile";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDate, formatMoney, formatNumber, todayIso } from "../../lib/format";
import type { ImportDailySalesResult } from "../../types/dailySales";
import { PAYMENT_METHOD_LABELS, SALES_CHANNEL_LABELS } from "../../types/enums";
import { DateFilter } from "../../components/ui/DateFilter";
import { SalesEntryForm } from "./SalesEntryForm";
import "./modules.css";

/**
 * Gün sonu satışları: o günün siparişleri girilir, sistem beklenen geliri ve reçeteye göre beklenen
 * malzeme tüketimini hesaplar (bkz. proje raporu 3.5, 3.10 adım 1).
 */
export function DailySalesPage() {
  const [date, setDate] = useState(todayIso());
  const [lastResult, setLastResult] = useState<ImportDailySalesResult | null>(null);
  const dishes = useAsyncData(dishApi.getAll);
  const platforms = useAsyncData(platformApi.getAll);
  const entries = useAsyncData(() => dailySalesApi.getByDate(date), date);
  const summary = useAsyncData(() => dailySalesApi.getExpectedSummary(date), date);

  return (
    <div>
      <PageHeader
        icon="🧾"
        title="Gün Sonu Satışları"
        description="Günün siparişlerini girin. Aynı satırları tekrar gönderirseniz iki kez sayılır. Paket servis komisyonları otomatik gider olarak işlenir."
        actions={<DateFilter id="sales-date" label="Tarih" value={date} onChange={setDate} />}
      />

      <StatGrid>
        <StatTile label="Beklenen gelir" value={summary.data ? formatMoney(summary.data.expectedRevenue) : "…"} />
        <StatTile label="Satış satırı" value={String(entries.data?.length ?? 0)} />
        <StatTile label="Satılan adet" value={String((entries.data ?? []).reduce((sum, e) => sum + e.quantity, 0))} />
      </StatGrid>

      <Section title={`${formatDate(date)} — satış girişi`}>
        <AsyncState data={dishes.data && platforms.data ? { dishes: dishes.data, platforms: platforms.data } : null} error={dishes.error ?? platforms.error} isLoading={dishes.isLoading || platforms.isLoading}>
          {(catalog) => (
            <SalesEntryForm
              date={date}
              dishes={catalog.dishes}
              platforms={catalog.platforms}
              onSubmit={async (rows) => {
                const result = await dailySalesApi.import({ fileName: `manuel-giris-${date}`, rows });
                setLastResult(result);
                await Promise.all([entries.reload(), summary.reload()]);
              }}
            />
          )}
        </AsyncState>
        {lastResult && (
          <div className={lastResult.errorCount > 0 ? "ui-error" : "ui-muted"}>
            {lastResult.successCount} satır kaydedildi{lastResult.errorCount > 0 && `, ${lastResult.errorCount} satır hatalı:`}
            {lastResult.errors.map((message) => (
              <div key={message}>{message}</div>
            ))}
          </div>
        )}
      </Section>

      <div className="ui-two-columns">
        <Section title="Girilen satışlar">
          <AsyncState {...entries} isEmpty={(rows) => rows.length === 0} emptyText="Bu tarih için satış girilmemiş.">
            {(rows) => (
              <DataTable
                rows={rows}
                rowKey={(row) => row.id}
                columns={[
                  { header: "Ürün", render: (row) => `${row.dishName} — ${row.sizeName}` },
                  { header: "Adet", align: "right", render: (row) => String(row.quantity) },
                  { header: "Tutar", align: "right", render: (row) => formatMoney(row.totalAmount) },
                  { header: "Ödeme", render: (row) => PAYMENT_METHOD_LABELS[row.paymentMethod] },
                  { header: "Kanal", render: (row) => row.platformName ?? SALES_CHANNEL_LABELS[row.channel] },
                ]}
              />
            )}
          </AsyncState>
        </Section>

        <Section title="Beklenen malzeme tüketimi">
          <AsyncState {...summary} isEmpty={(s) => s.expectedConsumption.length === 0} emptyText="Satış girildikçe reçeteye göre hesaplanır.">
            {(s) => (
              <DataTable
                rows={s.expectedConsumption}
                rowKey={(row) => row.ingredientId}
                columns={[
                  { header: "Malzeme", render: (row) => row.ingredientName },
                  { header: "Beklenen", align: "right", render: (row) => `${formatNumber(row.expectedQuantity)} ${row.unit}` },
                ]}
              />
            )}
          </AsyncState>
        </Section>
      </div>
    </div>
  );
}
