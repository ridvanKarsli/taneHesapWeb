import { Carrot, Coins, FileSpreadsheet, ListChecks, ReceiptText, Soup, Trash2 } from "lucide-react";
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
import type { DailySalesEntryDto, DailySalesImportMode, ImportDailySalesResult, ImportRowRequest } from "../../types/dailySales";
import { PAYMENT_METHOD_LABELS, SALES_CHANNEL_LABELS } from "../../types/enums";
import { DateFilter } from "../../components/ui/DateFilter";
import { Money } from "../../components/ui/Money";
import { IncomeVerificationHistory } from "./IncomeVerificationHistory";
import { IncomeVerificationPanel } from "./IncomeVerificationPanel";
import { SalesExcelImport } from "./SalesExcelImport";
import "./modules.css";

/**
 * Gün sonu: (1) günün Kasa, Yemeksepeti ve Uber Excel'leri yüklenir — satışlar, stok düşümü, komisyonlar;
 * (2) gelir doğrulama — kasadaki gerçek nakit ve POS'taki gerçek kart geliri girilir, kasaya gerçek tutar yazılır
 * (bkz. proje raporu 3.5, 3.10).
 */
export function DailySalesPage() {
  const [date, setDate] = useState(todayIso());
  const [lastResult, setLastResult] = useState<ImportDailySalesResult | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DailySalesEntryDto | "day" | null>(null);
  // Satış ya da doğrulama değişince doğrulama paneli ve geçmişi yeniden okunur.
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const dishes = useAsyncData(dishApi.getAll);
  const platforms = useAsyncData(platformApi.getAll);
  const entries = useAsyncData(() => dailySalesApi.getByDate(date), date);
  const summary = useAsyncData(() => dailySalesApi.getExpectedSummary(date), date);
  const catalog = dishes.data && platforms.data && entries.data ? { dishes: dishes.data, platforms: platforms.data, entries: entries.data } : null;

  async function importRows(fileName: string, rows: ImportRowRequest[], mode: DailySalesImportMode) {
    const result = await dailySalesApi.import({ fileName, rows, mode });
    setLastResult(result);
    await Promise.all([entries.reload(), summary.reload()]);
    bump();
  }

  return (
    <div>
      <PageHeader
        description="Önce günün Kasa, Yemeksepeti ve Uber Excel'lerini yükleyin; sonra kasadaki gerçek nakdi ve POS'taki gerçek kart toplamını girip doğrulayın. Aynı dosya ikinci kez yüklenirse gün iki kez sayılmaz."
        actions={<DateFilter id="sales-date" label="Tarih" value={date} onChange={setDate} />}
      />

      <StatGrid>
        <StatTile icon={Coins} label="Excel'deki satış" value={summary.data ? formatMoney(summary.data.expectedRevenue) : "…"} />
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

      <Section title="1. Excel ile yükle" icon={FileSpreadsheet}>
        <AsyncState data={catalog} error={dishes.error ?? platforms.error ?? entries.error} isLoading={!catalog && !dishes.error && !platforms.error && !entries.error}>
          {(c) => <SalesExcelImport date={date} onDateChange={setDate} ctx={c} entries={c.entries} reloadKey={String(version)} onImport={importRows} />}
        </AsyncState>
      </Section>

      <IncomeVerificationPanel date={date} reloadKey={String(version)} onChanged={bump} />

      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete === "day" ? "Günün tüm satışları silinsin mi?" : "Satış satırı silinsin mi?"}
          message={
            pendingDelete === "day"
              ? `${formatDate(date)} tarihine ait ${entries.data?.length ?? 0} satış satırı silinecek (örn. aynı dosya iki kez yüklendiyse). Platform komisyonu giderleri yeniden hesaplanır.`
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
            bump();
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
                  { header: "Tutar", align: "right", render: (row) => <Money value={row.totalAmount} /> },
                  { header: "Ödeme", render: (row) => PAYMENT_METHOD_LABELS[row.paymentMethod] },
                  { header: "Kanal", render: (row) => row.platformName ?? SALES_CHANNEL_LABELS[row.channel] },
                ]}
                rowActions={(row) => <DeleteButton onClick={() => setPendingDelete(row)} />}
              />
            )}
          </AsyncState>
        </Section>

        <Section title="Stoktan düşen malzeme (reçeteye göre)" icon={Carrot}>
          <AsyncState {...summary} isEmpty={(s) => s.expectedConsumption.length === 0} emptyText="Excel yüklendikçe reçeteye göre hesaplanır.">
            {(s) => (
              <DataTable
                rows={s.expectedConsumption}
                rowKey={(row) => row.ingredientId}
                columns={[
                  { header: "Malzeme", render: (row) => row.ingredientName },
                  { header: "Miktar", align: "right", render: (row) => `${formatNumber(row.expectedQuantity)} ${row.unit}` },
                ]}
              />
            )}
          </AsyncState>
        </Section>
      </div>

      <IncomeVerificationHistory reloadKey={String(version)} onPick={setDate} />
    </div>
  );
}
