import { CircleCheck, FileSpreadsheet, History, OctagonAlert, Percent, Upload, X } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { extractErrorMessage } from "../../api/apiError";
import { ErrorMessage } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { Money } from "../../components/ui/Money";
import { formatDate, formatPercent } from "../../lib/format";
import { readFirstSheet } from "../../lib/excelReader";
import { toImportRows, type CellValue, type ParsedRow } from "../../lib/salesExcel";
import { SALES_SOURCES, parseSourceSheet, platformOf, type SalesSource, type SalesSourceContext } from "../../lib/salesSources";
import { DailySalesImportMode, type DailySalesEntryDto, type ImportRowRequest } from "../../types/dailySales";
import type { PlatformDto } from "../../types/platform";
import { PAYMENT_METHOD_LABELS, SalesChannel } from "../../types/enums";
import { PlatformCommissionDialog } from "./PlatformCommissionDialog";
import { SalesUploadHistory } from "./SalesUploadHistory";

interface SalesExcelImportProps {
  date: string;
  /** Geçmiş yüklemelerden bir gün seçilince sayfanın tarihi değişir. */
  onDateChange: (date: string) => void;
  ctx: SalesSourceContext;
  /** O günün kayıtlı satışları — her kaynağın "yüklendi" durumu buradan çıkar. */
  entries: DailySalesEntryDto[];
  /** Satışlar değişince geçmiş listesi yeniden okunur. */
  reloadKey: string;
  onImport: (fileName: string, rows: ImportRowRequest[], mode: DailySalesImportMode) => Promise<void>;
  /** Komisyon oranı değişince platform listesi yeniden okunur. */
  onPlatformsChanged: () => Promise<void>;
}

/** Okunmuş dosya; ayrıştırma ürün listesi değiştikçe yeniden yapılır (Ürünler'e ekleyip dönünce satırlar eşleşir). */
interface Pending {
  source: SalesSource;
  fileName: string;
  sheet: CellValue[][];
}

/** Dosyadaki satırların günleri (tekrarsız, sıralı). */
function datesOf(rows: ParsedRow[]): string[] {
  return [...new Set(rows.map((r) => r.saleDate))].sort();
}

/** Seçilen gün için bu kaynaktan girilmiş satış satırları (kanal + platform eşleşmesi). */
function entriesOf(source: SalesSource, entries: DailySalesEntryDto[], ctx: SalesSourceContext) {
  const platform = platformOf(source, ctx.platforms);
  return entries.filter((e) => e.channel === source.channel && (source.channel === SalesChannel.InStore || e.platformId === platform?.id));
}

/** Ürün bazında özet: kaç tane, kaç para (işlenmiş görünümün üst tablosu). */
function summarizeByProduct(rows: ParsedRow[], label: (row: ParsedRow) => string) {
  const map = new Map<string, { name: string; quantity: number; amount: number }>();
  for (const row of rows) {
    const name = label(row);
    const entry = map.get(name) ?? { name, quantity: 0, amount: 0 };
    entry.quantity += row.quantity;
    entry.amount += row.totalAmount;
    map.set(name, entry);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

/**
 * Satışların tek giriş yolu: üç kaynak kartı (Kasa, Yemeksepeti, Trendyol Go). Platform dosyaları panelden
 * indirildiği gibi yüklenir (şablon yok). Dosya tarayıcıda okunur ve işlenmiş hâli gösterilir: tarih, ürün, adet,
 * tutar. Dosyadaki her ürün Ürünler listesinde olmak zorundadır — olmayan varsa dosya reddedilir, kullanıcı ürünleri
 * ekleyip dosyayı yeniden yükler. Hepsi eşleşince "Onayla ve kaydet" ile satışlar işlenir (stok düşer, kasaya yazılır).
 */
export function SalesExcelImport({ date, onDateChange, ctx, entries, reloadKey, onImport, onPlatformsChanged }: SalesExcelImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState<SalesSource | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [acceptOtherDates, setAcceptOtherDates] = useState(false);
  const [historyOf, setHistoryOf] = useState<SalesSource | null>(null);
  const [commissionOf, setCommissionOf] = useState<PlatformDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const parsed = useMemo(() => (pending ? parseSourceSheet(pending.source, pending.sheet, ctx) : null), [pending, ctx]);

  // Gece yüklemesi: 4'ünde saat 03:00'te 3'ünün dosyası yüklenir. Dosyadaki tarih seçili günden farklıysa uyarılır;
  // tek bir gün varsa seçili gün tek tıkla o güne alınır, birden çok gün varsa açıkça onaylanır.
  const fileDates = parsed ? datesOf(parsed.rows) : [];
  const otherDates = fileDates.filter((d) => d !== date);
  const dateMismatch = otherDates.length > 0;

  const sizeLabel = new Map(ctx.dishes.flatMap((d) => d.sizes.map((s) => [s.id, `${d.name} — ${s.name}`] as const)));
  const productLabel = (row: ParsedRow) => (row.dishSizeId ? (sizeLabel.get(row.dishSizeId) ?? "—") : (row.productName ?? "—"));
  const unmatched = parsed?.unmatchedProducts ?? [];
  const importRows = parsed ? toImportRows(parsed.rows) : null;
  const totalAmount = parsed?.rows.reduce((sum, r) => sum + r.totalAmount, 0) ?? 0;
  const totalQuantity = parsed?.rows.reduce((sum, r) => sum + r.quantity, 0) ?? 0;
  const canSave = importRows !== null && importRows.length > 0 && (!dateMismatch || acceptOtherDates);

  function pickFile(source: SalesSource) {
    setPicking(source);
    setError(null);
    fileInputRef.current?.click();
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !picking) {
      return;
    }

    setPending(null);
    setIsBusy(true);
    try {
      const sheet = await readFirstSheet(file);
      setPending({ source: picking, fileName: file.name, sheet });
      setReplaceExisting(false);
      setAcceptOtherDates(false);
    } catch {
      setError("Dosya okunamadı. Lütfen .xlsx formatında kaydedin.");
    } finally {
      setIsBusy(false);
    }
  }

  async function submit() {
    if (!pending || !importRows || !canSave) {
      return;
    }
    setError(null);
    setIsBusy(true);
    try {
      await onImport(
        `${pending.source.label}: ${pending.fileName}`,
        importRows,
        replaceExisting ? DailySalesImportMode.Replace : DailySalesImportMode.RejectIfExists,
      );
      setPending(null);
    } catch (submitError) {
      setError(extractErrorMessage(submitError));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div>
      <div className="sales-sources">
        {SALES_SOURCES.map((source) => {
          const platform = source.channel === SalesChannel.Platform ? platformOf(source, ctx.platforms) : null;
          const missingPlatform = source.channel === SalesChannel.Platform && !platform;
          const commissionUnset = platform !== null && platform.commissionPercentage === 0;
          const done = entriesOf(source, entries, ctx);
          return (
            <article key={source.id} className={`sales-source${done.length > 0 ? " done" : ""}`}>
              <div className="sales-source-head">
                <strong>{source.label}</strong>
                {platform && (
                  <button
                    type="button"
                    className="ui-button ghost small sales-source-commission"
                    onClick={() => setCommissionOf(platform)}
                    title="Bu platformun komisyon yüzdesini değiştir"
                  >
                    <Percent size={14} aria-hidden="true" />
                    Komisyonu güncelle · {formatPercent(platform.commissionPercentage)}
                  </button>
                )}
                {done.length > 0 ? (
                  <span className="sales-source-status">
                    <CircleCheck size={15} aria-hidden="true" /> {formatDate(date)} yüklendi · {done.length} satır
                  </span>
                ) : (
                  <span className="sales-source-status muted">{formatDate(date)} için yüklenmedi</span>
                )}
              </div>
              <p className="ui-muted">
                {missingPlatform
                  ? `${source.label} platformu pasif ya da silinmiş — Paket Servis'ten (süper admin) yeniden etkinleştirilince açılır.`
                  : source.hint}
              </p>
              {commissionUnset && (
                <p className="sales-source-warning" role="note">
                  Komisyon oranı girilmemiş (%0): komisyon gideri hesaplanmaz. “Komisyonu güncelle” ile {platform.name} oranını girin.
                </p>
              )}
              <div className="sales-source-actions">
                <button type="button" className="ui-button small" onClick={() => pickFile(source)} disabled={isBusy || missingPlatform}>
                  <FileSpreadsheet size={15} aria-hidden="true" />
                  Excel yükle
                </button>
                <button type="button" className="ui-button ghost small" onClick={() => setHistoryOf(source)}>
                  <History size={15} aria-hidden="true" />
                  Geçmiş yüklemeler
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <input ref={fileInputRef} type="file" accept=".xlsx" hidden onChange={(e) => void handleFile(e)} />

      {commissionOf && <PlatformCommissionDialog platform={commissionOf} onClose={() => setCommissionOf(null)} onSaved={onPlatformsChanged} />}

      {historyOf && (
        <SalesUploadHistory
          source={historyOf}
          ctx={ctx}
          reloadKey={reloadKey}
          onClose={() => setHistoryOf(null)}
          onUploadDay={(day) => {
            onDateChange(day);
            setHistoryOf(null);
            pickFile(historyOf);
          }}
        />
      )}

      {isBusy && !pending && <p className="ui-muted">Dosya okunuyor…</p>}
      {error && <ErrorMessage message={error} />}

      {pending && parsed && (
        <div className="excel-preview">
          <div className="excel-preview-head">
            <p className="ui-subheading">
              {pending.source.label} — {pending.fileName}: {parsed.rows.length} satır, {totalQuantity} adet, <Money value={totalAmount} />
              {parsed.errors.length > 0 && `, ${parsed.errors.length} hatalı satır`}
            </p>
            <button type="button" className="ui-button ghost small" onClick={() => setPending(null)} aria-label="Önizlemeyi kapat">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          {parsed.errors.length > 0 && (
            <div className="ui-error excel-errors">
              <div>
                {parsed.errors.slice(0, 10).map((message) => (
                  <div key={message}>{message}</div>
                ))}
                {parsed.errors.length > 10 && <div>… ve {parsed.errors.length - 10} hata daha.</div>}
              </div>
            </div>
          )}
          {unmatched.length > 0 && (
            <div className="excel-rejected" role="alert">
              <OctagonAlert size={18} aria-hidden="true" />
              <div className="excel-rejected-body">
                <p>
                  <strong>Dosya kaydedilemez: {unmatched.length} ürün Ürünler listesinde yok.</strong> Bu ürünleri{" "}
                  <Link to="/mutfak/urunler">Mutfak ve Stok → Ürünler</Link>'e dosyadaki adla (parantezdeki boy dahil) ekleyin, reçetesini girin ve
                  dosyayı yeniden yükleyin. Eklemeden kaydedilirse o ürünlerin stoğu düşmez; bu yüzden reddedilir.
                </p>
                <ul className="excel-rejected-list">
                  {unmatched.map((u) => (
                    <li key={u.name}>
                      <strong>{u.name}</strong>
                      <span className="ui-muted">
                        ×{u.quantity}
                        {u.unitPrice !== null && (
                          <>
                            {" "}
                            · <Money value={u.unitPrice} />
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {dateMismatch && (
            <div className="excel-date-warning" role="alert">
              <span>
                Dosyadaki satırlar <strong>{fileDates.map(formatDate).join(", ")}</strong> tarihli; seçili gün <strong>{formatDate(date)}</strong>.
                Satışlar dosyadaki tarihe kaydedilir.
              </span>
              {fileDates.length === 1 ? (
                <button type="button" className="ui-button small" onClick={() => onDateChange(fileDates[0])}>
                  Seçili günü {formatDate(fileDates[0])} yap
                </button>
              ) : (
                <label className="ui-checkbox" htmlFor="excel-accept-dates">
                  <input id="excel-accept-dates" type="checkbox" checked={acceptOtherDates} onChange={(e) => setAcceptOtherDates(e.target.checked)} />
                  Dosyada birden çok gün var, bu tarihlerle kaydedilsin
                </label>
              )}
            </div>
          )}
          {parsed.rows.length > 0 && (
            <>
              <h3 className="excel-section-title">Ürün özeti</h3>
              <DataTable
                rows={summarizeByProduct(parsed.rows, productLabel)}
                rowKey={(row) => row.name}
                columns={[
                  { header: "Ürün", render: (row) => <span className="ui-cell-strong">{row.name}</span> },
                  { header: "Adet", align: "right", render: (row) => String(row.quantity) },
                  { header: "Tutar", align: "right", render: (row) => <Money value={row.amount} /> },
                ]}
              />
              <h3 className="excel-section-title">İşlenmiş satırlar ({parsed.rows.length})</h3>
              <div className="excel-rows">
                <DataTable
                  rows={parsed.rows.map((row, index) => ({ ...row, key: String(index) }))}
                  rowKey={(row) => row.key}
                  rowClassName={(row) => (row.dishSizeId ? undefined : "excel-row-unmatched")}
                  columns={[
                    { header: "Tarih", render: (row) => `${formatDate(row.saleDate)}${row.saleTime ? ` ${row.saleTime.slice(0, 5)}` : ""}` },
                    {
                      header: "Ürün",
                      render: (row) =>
                        row.dishSizeId ? (
                          productLabel(row)
                        ) : (
                          <span className="excel-unmatched-cell">
                            {row.productName ?? "—"} <span className="ui-badge danger">listede yok</span>
                          </span>
                        ),
                    },
                    { header: "Adet", align: "right", render: (row) => String(row.quantity) },
                    { header: "Tutar", align: "right", render: (row) => <Money value={row.totalAmount} /> },
                    { header: "Ödeme", render: (row) => PAYMENT_METHOD_LABELS[row.paymentMethod] },
                    { header: "Sipariş no", render: (row) => row.externalOrderNumber ?? "—" },
                  ]}
                />
              </div>
              <label className="ui-checkbox" htmlFor="excel-replace-existing">
                <input id="excel-replace-existing" type="checkbox" checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)} />
                Bu dosyadaki günlerin mevcut {pending.source.label} satışlarını değiştir (düzeltilmiş dosyayı yeniden yüklerken)
              </label>
              <div className="ui-form-actions excel-actions">
                <button type="button" className="ui-button" onClick={() => void submit()} disabled={isBusy || !canSave}>
                  <Upload size={16} aria-hidden="true" />
                  {isBusy ? "Kaydediliyor…" : unmatched.length > 0 ? "Önce eksik ürünleri ekleyin" : `Onayla ve kaydet (${parsed.rows.length} satır)`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
