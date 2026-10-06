import { CircleCheck, FileSpreadsheet, History, PackagePlus, TriangleAlert, Upload, X } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { extractErrorMessage } from "../../api/apiError";
import { dishApi } from "../../api/moduleApis";
import { ErrorMessage } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { Money } from "../../components/ui/Money";
import { formatDate } from "../../lib/format";
import { readFirstSheet } from "../../lib/excelReader";
import type { CellValue, UnmatchedProduct } from "../../lib/salesExcel";
import { SALES_SOURCES, parseSourceSheet, platformOf, type SalesSource, type SalesSourceContext } from "../../lib/salesSources";
import { DailySalesImportMode, type DailySalesEntryDto, type ImportRowRequest } from "../../types/dailySales";
import { PAYMENT_METHOD_LABELS, SalesChannel } from "../../types/enums";
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
  /** Önizlemeden ürün eklenince ürün listesi yeniden okunur; dosya yeni listeyle yeniden eşleştirilir. */
  onCatalogChanged: () => Promise<void>;
}

/** Okunmuş dosya; ayrıştırma (`parsed`) ürün listesi değiştikçe yeniden yapılır — ürün eklenince satırlar anında eşleşir. */
interface Pending {
  source: SalesSource;
  fileName: string;
  sheet: CellValue[][];
}

/** Eşleşmeyen ürünün sistemde açılacağı boy adı (parantezdeki boy zaten ürün adının parçasıdır). */
const DEFAULT_SIZE_NAME = "Porsiyon";

const PREVIEW_LIMIT = 8;

/** Önizleme: eşleşmeyen satırlar başa alınır ki ne eksik hemen görülsün; sonra dosya sırası. */
function previewRows(rows: ImportRowRequest[]) {
  return rows
    .map((row, index) => ({ ...row, key: String(index), order: row.dishSizeId === null ? 0 : 1 }))
    .sort((a, b) => a.order - b.order || Number(a.key) - Number(b.key))
    .slice(0, PREVIEW_LIMIT);
}

/** Dosyadaki satırların günleri (tekrarsız, sıralı). */
function datesOf(rows: ImportRowRequest[]): string[] {
  return [...new Set(rows.map((r) => r.saleDate))].sort();
}

/** Seçilen gün için bu kaynaktan girilmiş satış satırları (kanal + platform eşleşmesi). */
function entriesOf(source: SalesSource, entries: DailySalesEntryDto[], ctx: SalesSourceContext) {
  const platform = platformOf(source, ctx.platforms);
  return entries.filter((e) => e.channel === source.channel && (source.channel === SalesChannel.InStore || e.platformId === platform?.id));
}

/**
 * Satışların tek giriş yolu: üç kaynak kartı (Kasa, Yemeksepeti, Trendyol Go). Platform dosyaları panelden
 * indirildiği gibi yüklenir (şablon yok). Her kart seçili gün için yüklendi mi gösterir; dosya seçilince tarayıcıda
 * okunur, önizlenir ve onaylanınca kaydedilir. Aynı kaynağın aynı günü ikinci kez yüklenirse sunucu reddeder
 * ("değiştir" işaretlenirse o kaynağın o günkü satırları yenilenir).
 */
export function SalesExcelImport({ date, onDateChange, ctx, entries, reloadKey, onImport, onCatalogChanged }: SalesExcelImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState<SalesSource | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [acceptOtherDates, setAcceptOtherDates] = useState(false);
  const [historyOf, setHistoryOf] = useState<SalesSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [addingProduct, setAddingProduct] = useState<string | null>(null);

  const parsed = useMemo(() => (pending ? parseSourceSheet(pending.source, pending.sheet, ctx) : null), [pending, ctx]);

  // Gece yüklemesi: 4'ünde saat 03:00'te 3'ünün dosyası yüklenir. Dosyadaki tarih seçili günden farklıysa uyarılır;
  // tek bir gün varsa seçili gün tek tıkla o güne alınır, birden çok gün varsa açıkça onaylanır.
  const fileDates = parsed ? datesOf(parsed.rows) : [];
  const otherDates = fileDates.filter((d) => d !== date);
  const dateMismatch = otherDates.length > 0;
  const canSave = parsed !== null && parsed.rows.length > 0 && (!dateMismatch || acceptOtherDates);

  const sizeLabel = new Map(ctx.dishes.flatMap((d) => d.sizes.map((s) => [s.id, `${d.name} — ${s.name}`] as const)));
  const unmatched = parsed?.unmatchedProducts ?? [];
  const unmatchedRowCount = parsed?.rows.filter((r) => r.dishSizeId === null).length ?? 0;

  /** Dosyadaki adla ürün açar (tek boy; fiyat dosyadan okunabildiyse o, yoksa 0 — Ürünler'den düzeltilir). */
  async function addProducts(products: UnmatchedProduct[]) {
    setError(null);
    setAddingProduct(products.length === 1 ? products[0].name : "*");
    try {
      for (const product of products) {
        const dish = await dishApi.create({ name: product.name, description: "Platform dosyasından eklendi — reçetesini Ürünler'den girin." });
        await dishApi.addSize(dish.id, { name: DEFAULT_SIZE_NAME, salePrice: product.unitPrice ?? 0, recipeItems: [] });
      }
      await onCatalogChanged();
    } catch (addError) {
      setError(extractErrorMessage(addError));
    } finally {
      setAddingProduct(null);
    }
  }

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
    if (!pending || !parsed || !canSave) {
      return;
    }
    setError(null);
    setIsBusy(true);
    try {
      await onImport(
        `${pending.source.label}: ${pending.fileName}`,
        parsed.rows,
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
          const missingPlatform = source.channel === SalesChannel.Platform && !platformOf(source, ctx.platforms);
          const done = entriesOf(source, entries, ctx);
          return (
            <article key={source.id} className={`sales-source${done.length > 0 ? " done" : ""}`}>
              <div className="sales-source-head">
                <strong>{source.label}</strong>
                {done.length > 0 ? (
                  <span className="sales-source-status">
                    <CircleCheck size={15} aria-hidden="true" /> {formatDate(date)} yüklendi · {done.length} satır
                  </span>
                ) : (
                  <span className="sales-source-status muted">{formatDate(date)} için yüklenmedi</span>
                )}
              </div>
              <p className="ui-muted">{missingPlatform ? `${source.label} platformu henüz tanımlı değil — sistem yöneticiniz komisyon oranıyla birlikte ekleyince açılır.` : source.hint}</p>
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
              {pending.source.label} — {pending.fileName}: {parsed.rows.length} geçerli satır
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
            <div className="excel-unmatched" role="status">
              <TriangleAlert size={16} aria-hidden="true" />
              <div className="excel-unmatched-body">
                <p>
                  <strong>{unmatchedRowCount} satır sistemdeki ürünlerle eşleşmedi</strong> — gelir olarak kaydedilir ama reçetesi olmadığı için
                  stoktan düşmez. Dosyadaki adla ürün olarak ekleyin; reçetesini sonra Mutfak ve Stok → Ürünler'den girersiniz.
                </p>
                <ul className="excel-unmatched-list">
                  {unmatched.map((u) => (
                    <li key={u.name}>
                      <span>
                        {u.name} <span className="ui-muted">×{u.quantity}{u.unitPrice !== null && ` · ₺${u.unitPrice}`}</span>
                      </span>
                      <button
                        type="button"
                        className="ui-button small"
                        disabled={addingProduct !== null || isBusy}
                        onClick={() => void addProducts([u])}
                      >
                        <PackagePlus size={14} aria-hidden="true" />
                        {addingProduct === u.name ? "Ekleniyor…" : "Ürün olarak ekle"}
                      </button>
                    </li>
                  ))}
                </ul>
                {unmatched.length > 1 && (
                  <button type="button" className="ui-button secondary small" disabled={addingProduct !== null || isBusy} onClick={() => void addProducts(unmatched)}>
                    <PackagePlus size={14} aria-hidden="true" />
                    {addingProduct === "*" ? "Ekleniyor…" : `Hepsini ekle (${unmatched.length} ürün)`}
                  </button>
                )}
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
              <DataTable
                rows={previewRows(parsed.rows)}
                rowKey={(row) => row.key}
                columns={[
                  { header: "Tarih", render: (row) => formatDate(row.saleDate) },
                  {
                    header: "Ürün",
                    render: (row) =>
                      row.dishSizeId ? (
                        sizeLabel.get(row.dishSizeId) ?? "—"
                      ) : (
                        <span className="excel-unmatched-cell">
                          {row.productName ?? "—"} <span className="ui-badge warning">eşleşmedi</span>
                        </span>
                      ),
                  },
                  { header: "Adet", align: "right", render: (row) => String(row.quantity) },
                  { header: "Tutar", align: "right", render: (row) => <Money value={row.totalAmount} /> },
                  { header: "Ödeme", render: (row) => PAYMENT_METHOD_LABELS[row.paymentMethod] },
                ]}
              />
              {parsed.rows.length > PREVIEW_LIMIT && <p className="ui-muted">… ve {parsed.rows.length - PREVIEW_LIMIT} satır daha.</p>}
              <label className="ui-checkbox" htmlFor="excel-replace-existing">
                <input id="excel-replace-existing" type="checkbox" checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)} />
                Bu dosyadaki günlerin mevcut {pending.source.label} satışlarını değiştir (düzeltilmiş dosyayı yeniden yüklerken)
              </label>
              <div className="ui-form-actions excel-actions">
                <button type="button" className="ui-button" onClick={() => void submit()} disabled={isBusy || !canSave}>
                  <Upload size={16} aria-hidden="true" />
                  {isBusy ? "Yükleniyor…" : `${parsed.rows.length} satırı kaydet`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
