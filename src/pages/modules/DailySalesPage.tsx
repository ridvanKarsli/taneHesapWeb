import { Carrot, Coins, FileSpreadsheet, ListChecks, Plus, ReceiptText, Soup, Trash2 } from "lucide-react";
import { useState } from "react";
import { dailySalesApi, dishApi, platformApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { ConfirmDialog, DeleteButton } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Section";
import { StatGrid, StatTile } from "../../components/ui/StatTile";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDate, formatMoney, formatNumber, todayIso } from "../../lib/format";
import type { DailySalesEntryDto, ImportDailySalesResult, ImportRowRequest } from "../../types/dailySales";
import { PAYMENT_METHOD_LABELS, SALES_CHANNEL_LABELS } from "../../types/enums";
import { DateFilter } from "../../components/ui/DateFilter";
import { SalesEntryForm } from "./SalesEntryForm";
import { SalesExcelImport } from "./SalesExcelImport";
import "./modules.css";

/**
 * Gün sonu satışları: o günün siparişleri girilir, sistem beklenen geliri ve reçeteye göre beklenen
 * malzeme tüketimini hesaplar (bkz. proje raporu 3.5, 3.10 adım 1).
 */
export function DailySalesPage() {
  const [date, setDate] = useState(todayIso());
  const [lastResult, setLastResult] = useState<ImportDailySalesResult | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DailySalesEntryDto | "day" | null>(null);
  const dishes = useAsyncData(dishApi.getAll);
  const platforms = useAsyncData(platformApi.getAll);
  const entries = useAsyncData(() => dailySalesApi.getByDate(date), date);
  const summary = useAsyncData(() => dailySalesApi.getExpectedSummary(date), date);
  const catalog = dishes.data && platforms.data ? { dishes: dishes.data, platforms: platforms.data } : null;

  async function importRows(fileName: string, rows: ImportRowRequest[]) {
    const result = await dailySalesApi.import({ fileName, rows });
    setLastResult(result);
    await Promise.all([entries.reload(), summary.reload()]);
  }

  return (
    <div>
      <PageHeader
        title="Gün Sonu Satışları"
        description="Günün siparişlerini Excel ile yükleyin veya elle girin. Aynı satırları tekrar gönderirseniz iki kez sayılır; paket servis komisyonları otomatik gider olarak işlenir."
        actions={<DateFilter id="sales-date" label="Tarih" value={date} onChange={setDate} />}
      />

      <StatGrid>
        <StatTile icon={Coins} label="Beklenen gelir" value={summary.data ? formatMoney(summary.data.expectedRevenue) : "…"} />
        <StatTile icon={ReceiptText} iconTone="blue" label="Satış satırı" value={String(entries.data?.length ?? 0)} />
        <StatTile icon={Soup} iconTone="green" label="Satılan adet" value={String((entries.data ?? []).reduce((sum, e) => sum + e.quantity, 0))} />
      </StatGrid>

      {lastResult && (
        <div className={lastResult.errorCount > 0 ? "ui-error import-result" : "ui-success import-result"}>
          {lastResult.successCount} satır kaydedildi{lastResult.errorCount > 0 && `, ${lastResult.errorCount} satır hatalı:`}
          {lastResult.errors.map((message) => (
            <div key={message}>{message}</div>
          ))}
        </div>
      )}

      <Section title="Excel ile yükle" icon={FileSpreadsheet}>
        <AsyncState data={catalog} error={dishes.error ?? platforms.error} isLoading={dishes.isLoading || platforms.isLoading}>
          {(c) => <SalesExcelImport date={date} dishes={c.dishes} platforms={c.platforms} onImport={importRows} />}
        </AsyncState>
      </Section>

      <Section title={`${formatDate(date)} — elle satış girişi`} icon={Plus}>
        <AsyncState data={catalog} error={dishes.error ?? platforms.error} isLoading={dishes.isLoading || platforms.isLoading}>
          {(c) => (
            <SalesEntryForm
              date={date}
              dishes={c.dishes}
              platforms={c.platforms}
              onSubmit={(rows) => importRows(`manuel-giris-${date}`, rows)}
            />
          )}
        </AsyncState>
      </Section>

      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete === "day" ? "Günün tüm satışları silinsin mi?" : "Satış satırı silinsin mi?"}
          message={
            pendingDelete === "day"
              ? `${formatDate(date)} tarihine ait ${entries.data?.length ?? 0} satış satırı silinecek (örn. aynı dosya iki kez yüklendiyse). Platform komisyonu giderleri yeniden hesaplanır. Gün sonu kapanışı yapıldıysa kapanışı yeniden gönderin.`
              : `"${pendingDelete.dishName} — ${pendingDelete.sizeName}" × ${pendingDelete.quantity} (${formatMoney(pendingDelete.totalAmount)}) satırı silinecek. Platform komisyonu yeniden hesaplanır.`
          }
          onClose={() => setPendingDelete(null)}
          onConfirm={async () => {
            if (pendingDelete === "day") {
              await dailySalesApi.removeByDate(date);
            } else {
              await dailySalesApi.removeEntry(pendingDelete.id);
            }
            setLastResult(null);
            await Promise.all([entries.reload(), summary.reload()]);
          }}
        />
      )}

      <div className="ui-two-columns">
        <Section
          title="Girilen satışlar"
          icon={ListChecks}
          actions={
            (entries.data?.length ?? 0) > 0 && (
              <button type="button" className="ui-button secondary small" onClick={() => setPendingDelete("day")}>
                <Trash2 size={14} aria-hidden="true" />
                Günün satışlarını sil
              </button>
            )
          }
        >
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
                rowActions={(row) => <DeleteButton onClick={() => setPendingDelete(row)} />}
              />
            )}
          </AsyncState>
        </Section>

        <Section title="Beklenen malzeme tüketimi" icon={Carrot}>
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
