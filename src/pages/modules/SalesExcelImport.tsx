import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { extractErrorMessage } from "../../api/apiError";
import { ErrorMessage } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { Money } from "../../components/ui/Money";
import { formatDate } from "../../lib/format";
import { buildTemplateSheets, parseSalesSheet, type CellValue, type ParsedSales } from "../../lib/salesExcel";
import { DailySalesImportMode, type ImportRowRequest } from "../../types/dailySales";
import type { DishDto } from "../../types/dish";
import { PAYMENT_METHOD_LABELS, SALES_CHANNEL_LABELS } from "../../types/enums";
import type { PlatformDto } from "../../types/platform";

interface SalesExcelImportProps {
  date: string;
  dishes: DishDto[];
  platforms: PlatformDto[];
  onImport: (fileName: string, rows: ImportRowRequest[], mode: DailySalesImportMode) => Promise<void>;
}

const PREVIEW_LIMIT = 8;

/**
 * Gün sonu satışlarının Excel ile toplu yüklenmesi (bkz. proje raporu 3.5): şablon indirme, dosyayı
 * tarayıcıda okuyup doğrulama (önizleme + satır hataları) ve geçerli satırları mevcut import uç
 * noktasına gönderme. Excel kütüphaneleri sadece kullanıldığında yüklenir (ilk açılışı yavaşlatmaz).
 */
export function SalesExcelImport({ date, dishes, platforms, onImport }: SalesExcelImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [parsed, setParsed] = useState<ParsedSales | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const sizeLabel = new Map(dishes.flatMap((d) => d.sizes.map((s) => [s.id, `${d.name} — ${s.name}`] as const)));
  const platformName = new Map(platforms.map((p) => [p.id, p.name]));

  async function downloadTemplate() {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const { salesSheet, listSheet } = buildTemplateSheets(dishes, platforms, date);
    const toCells = (rows: CellValue[][]) => rows.map((row) => row.map((value) => (value === "" ? null : value)));
    await writeXlsxFile(
      [
        { sheet: "Satışlar", data: toCells(salesSheet) as never, columns: [{ width: 12 }, { width: 8 }, { width: 24 }, { width: 12 }, { width: 8 }, { width: 10 }, { width: 10 }, { width: 14 }, { width: 16 }, { width: 10 }] },
        { sheet: "Liste", data: toCells(listSheet) as never, columns: [{ width: 24 }, { width: 12 }, { width: 12 }, { width: 4 }, { width: 18 }, { width: 4 }, { width: 10 }, { width: 14 }] },
      ],
      {},
    ).toFile(`gun-sonu-satis-sablonu-${date}.xlsx`);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setError(null);
    setParsed(null);
    setFileName(file.name);
    setIsBusy(true);
    try {
      const { readSheet } = await import("read-excel-file/browser");
      const sheet = (await readSheet(file)) as CellValue[][];
      setParsed(parseSalesSheet(sheet, dishes, platforms));
    } catch {
      setError("Dosya okunamadı. Lütfen .xlsx formatında ve şablondaki başlıklarla kaydedin.");
    } finally {
      setIsBusy(false);
    }
  }

  async function submit() {
    if (!parsed || parsed.rows.length === 0 || !fileName) {
      return;
    }
    setError(null);
    setIsBusy(true);
    try {
      await onImport(fileName, parsed.rows, replaceExisting ? DailySalesImportMode.Replace : DailySalesImportMode.RejectIfExists);
      setParsed(null);
      setFileName(null);
    } catch (submitError) {
      setError(extractErrorMessage(submitError));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div>
      <p className="ui-muted">
        Şablonu indirip doldurun (ürün ve boy adları "Liste" sayfasındakilerle aynı olmalı), sonra dosyayı yükleyin.
        Tutar boş bırakılırsa satış fiyatı × adet kullanılır.
      </p>
      <div className="ui-form-actions excel-actions">
        <button type="button" className="ui-button secondary" onClick={() => void downloadTemplate()}>
          <Download size={16} aria-hidden="true" />
          Şablonu indir
        </button>
        <button type="button" className="ui-button secondary" onClick={() => fileInputRef.current?.click()} disabled={isBusy}>
          <FileSpreadsheet size={16} aria-hidden="true" />
          Excel dosyası seç
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx" hidden onChange={(e) => void handleFile(e)} />
      </div>

      {isBusy && !parsed && <p className="ui-muted">Dosya okunuyor…</p>}
      {error && <ErrorMessage message={error} />}

      {parsed && (
        <div className="excel-preview">
          <p className="ui-subheading">
            {fileName} — {parsed.rows.length} geçerli satır{parsed.errors.length > 0 && `, ${parsed.errors.length} hatalı satır`}
          </p>
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
          {parsed.rows.length > 0 && (
            <>
              <DataTable
                rows={parsed.rows.slice(0, PREVIEW_LIMIT).map((row, index) => ({ ...row, key: String(index) }))}
                rowKey={(row) => row.key}
                columns={[
                  { header: "Tarih", render: (row) => formatDate(row.saleDate) },
                  { header: "Ürün", render: (row) => sizeLabel.get(row.dishSizeId) ?? "—" },
                  { header: "Adet", align: "right", render: (row) => String(row.quantity) },
                  { header: "Tutar", align: "right", render: (row) => <Money value={row.totalAmount} /> },
                  { header: "Ödeme", render: (row) => PAYMENT_METHOD_LABELS[row.paymentMethod] },
                  {
                    header: "Kanal",
                    render: (row) => (row.platformId ? platformName.get(row.platformId) : SALES_CHANNEL_LABELS[row.channel]) ?? "—",
                  },
                ]}
              />
              {parsed.rows.length > PREVIEW_LIMIT && (
                <p className="ui-muted">… ve {parsed.rows.length - PREVIEW_LIMIT} satır daha.</p>
              )}
              <label className="ui-checkbox" htmlFor="excel-replace-existing">
                <input
                  id="excel-replace-existing"
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                />
                Dosyadaki günlerin mevcut satış kayıtlarını değiştir (düzeltilmiş dosyayı yeniden yüklerken)
              </label>
              <div className="ui-form-actions excel-actions">
                <button type="button" className="ui-button" onClick={() => void submit()} disabled={isBusy}>
                  <Upload size={16} aria-hidden="true" />
                  {isBusy ? "Yükleniyor…" : `${parsed.rows.length} satırı içe aktar`}
                </button>
                <button type="button" className="ui-button secondary" onClick={() => setParsed(null)} disabled={isBusy}>
                  Vazgeç
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
