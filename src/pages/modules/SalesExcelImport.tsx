import { CircleCheck, Download, FileSpreadsheet, History, Upload, X } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { extractErrorMessage } from "../../api/apiError";
import { ErrorMessage } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { Money } from "../../components/ui/Money";
import { formatDate } from "../../lib/format";
import type { CellValue, ParsedSales } from "../../lib/salesExcel";
import { SALES_SOURCES, buildSourceTemplate, parseSourceSheet, platformOf, type SalesSource, type SalesSourceContext } from "../../lib/salesSources";
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
}

interface Pending {
  source: SalesSource;
  fileName: string;
  parsed: ParsedSales;
}

const PREVIEW_LIMIT = 8;

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
 * Satışların tek giriş yolu: üç kaynak kartı (Kasa, Yemeksepeti, Uber). Her kart seçili gün için yüklendi mi
 * gösterir; dosya seçilince tarayıcıda okunur, önizlenir ve onaylanınca kaydedilir. Aynı kaynağın aynı günü
 * ikinci kez yüklenirse sunucu reddeder ("değiştir" işaretlenirse o kaynağın o günkü satırları yenilenir).
 */
export function SalesExcelImport({ date, onDateChange, ctx, entries, reloadKey, onImport }: SalesExcelImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState<SalesSource | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [acceptOtherDates, setAcceptOtherDates] = useState(false);
  const [historyOf, setHistoryOf] = useState<SalesSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Gece yüklemesi: 4'ünde saat 03:00'te 3'ünün dosyası yüklenir. Dosyadaki tarih seçili günden farklıysa uyarılır;
  // tek bir gün varsa seçili gün tek tıkla o güne alınır, birden çok gün varsa açıkça onaylanır.
  const fileDates = pending ? datesOf(pending.parsed.rows) : [];
  const otherDates = fileDates.filter((d) => d !== date);
  const dateMismatch = otherDates.length > 0;
  const canSave = pending !== null && pending.parsed.rows.length > 0 && (!dateMismatch || acceptOtherDates);

  const sizeLabel = new Map(ctx.dishes.flatMap((d) => d.sizes.map((s) => [s.id, `${d.name} — ${s.name}`] as const)));

  async function downloadTemplate(source: SalesSource) {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const { salesSheet, listSheet } = buildSourceTemplate(source, ctx, date);
    const toCells = (rows: CellValue[][]) => rows.map((row) => row.map((value) => (value === "" ? null : value)));
    await writeXlsxFile(
      [
        { sheet: "Satışlar", data: toCells(salesSheet) as never, columns: [{ width: 12 }, { width: 8 }, { width: 24 }, { width: 12 }, { width: 8 }, { width: 10 }, { width: 10 }, { width: 10 }] },
        { sheet: "Liste", data: toCells(listSheet) as never, columns: [{ width: 24 }, { width: 12 }, { width: 12 }, { width: 4 }, { width: 10 }] },
      ],
      {},
    ).toFile(`${source.id}-satis-sablonu-${date}.xlsx`);
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
      const { readSheet } = await import("read-excel-file/browser");
      const sheet = (await readSheet(file)) as CellValue[][];
      setPending({ source: picking, fileName: file.name, parsed: parseSourceSheet(picking, sheet, ctx) });
      setReplaceExisting(false);
      setAcceptOtherDates(false);
    } catch {
      setError("Dosya okunamadı. Lütfen .xlsx formatında kaydedin.");
    } finally {
      setIsBusy(false);
    }
  }

  async function submit() {
    if (!pending || !canSave) {
      return;
    }
    setError(null);
    setIsBusy(true);
    try {
      await onImport(
        `${pending.source.label}: ${pending.fileName}`,
        pending.parsed.rows,
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
                <button type="button" className="ui-button ghost small" onClick={() => void downloadTemplate(source)}>
                  <Download size={15} aria-hidden="true" />
                  Şablon
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

      {pending && (
        <div className="excel-preview">
          <div className="excel-preview-head">
            <p className="ui-subheading">
              {pending.source.label} — {pending.fileName}: {pending.parsed.rows.length} geçerli satır
              {pending.parsed.errors.length > 0 && `, ${pending.parsed.errors.length} hatalı satır`}
            </p>
            <button type="button" className="ui-button ghost small" onClick={() => setPending(null)} aria-label="Önizlemeyi kapat">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          {pending.parsed.errors.length > 0 && (
            <div className="ui-error excel-errors">
              <div>
                {pending.parsed.errors.slice(0, 10).map((message) => (
                  <div key={message}>{message}</div>
                ))}
                {pending.parsed.errors.length > 10 && <div>… ve {pending.parsed.errors.length - 10} hata daha.</div>}
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
          {pending.parsed.rows.length > 0 && (
            <>
              <DataTable
                rows={pending.parsed.rows.slice(0, PREVIEW_LIMIT).map((row, index) => ({ ...row, key: String(index) }))}
                rowKey={(row) => row.key}
                columns={[
                  { header: "Tarih", render: (row) => formatDate(row.saleDate) },
                  { header: "Ürün", render: (row) => sizeLabel.get(row.dishSizeId) ?? "—" },
                  { header: "Adet", align: "right", render: (row) => String(row.quantity) },
                  { header: "Tutar", align: "right", render: (row) => <Money value={row.totalAmount} /> },
                  { header: "Ödeme", render: (row) => PAYMENT_METHOD_LABELS[row.paymentMethod] },
                ]}
              />
              {pending.parsed.rows.length > PREVIEW_LIMIT && <p className="ui-muted">… ve {pending.parsed.rows.length - PREVIEW_LIMIT} satır daha.</p>}
              <label className="ui-checkbox" htmlFor="excel-replace-existing">
                <input id="excel-replace-existing" type="checkbox" checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)} />
                Bu dosyadaki günlerin mevcut {pending.source.label} satışlarını değiştir (düzeltilmiş dosyayı yeniden yüklerken)
              </label>
              <div className="ui-form-actions excel-actions">
                <button type="button" className="ui-button" onClick={() => void submit()} disabled={isBusy || !canSave}>
                  <Upload size={16} aria-hidden="true" />
                  {isBusy ? "Yükleniyor…" : `${pending.parsed.rows.length} satırı kaydet`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
