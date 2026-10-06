import { CircleCheck, Upload } from "lucide-react";
import { useState } from "react";
import { dailySalesApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { Modal } from "../../components/ui/Modal";
import { Money } from "../../components/ui/Money";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import { addDaysIso, formatDate, formatRecordedAt, todayIso } from "../../lib/format";
import { platformOf, type SalesSource, type SalesSourceContext } from "../../lib/salesSources";
import type { DailySalesUploadDto } from "../../types/dailySales";
import { SalesChannel } from "../../types/enums";

const DAY_CHOICES = [14, 30, 60, 90] as const;

interface SalesUploadHistoryProps {
  source: SalesSource;
  ctx: SalesSourceContext;
  /** Satışlar değişince (yükleme/silme) liste yeniden okunur. */
  reloadKey: string;
  onClose: () => void;
  /** "Yükle": o günü seçip bu kaynağın dosya seçicisini açar. */
  onUploadDay: (date: string) => void;
}

interface DayRow {
  date: string;
  upload: DailySalesUploadDto | null;
}

/** Yüklemenin bu kaynağa ait olup olmadığı (kanal + platform eşleşmesi). */
function belongsTo(source: SalesSource, upload: DailySalesUploadDto, platformId: string | null): boolean {
  return upload.channel === source.channel && (source.channel === SalesChannel.InStore || upload.platformId === platformId);
}

/** Bugünden geriye `days` gün; her gün için bu kaynağın yüklemesi ya da boş. En yeni üstte. */
function buildDays(days: number, uploads: DailySalesUploadDto[], source: SalesSource, platformId: string | null): DayRow[] {
  const today = todayIso();
  const byDate = new Map(uploads.filter((u) => belongsTo(source, u, platformId)).map((u) => [u.date, u] as const));
  return Array.from({ length: days }, (_, i) => {
    const date = addDaysIso(today, -i);
    return { date, upload: byDate.get(date) ?? null };
  });
}

/**
 * Bir kaynağın (Kasa / Yemeksepeti / Trendyol Go) geçmiş yüklemeleri: son N gün, her gün için "yüklendi · satır · tutar"
 * ya da "yüklenmedi" + Yükle düğmesi. Böylece atlanan bir gün sonradan tamamlanabilir.
 */
export function SalesUploadHistory({ source, ctx, reloadKey, onClose, onUploadDay }: SalesUploadHistoryProps) {
  const [days, setDays] = useState<(typeof DAY_CHOICES)[number]>(30);
  const today = todayIso();
  const uploads = useAsyncData(() => dailySalesApi.getUploads(addDaysIso(today, -(days - 1)), today), `${today}|${days}|${reloadKey}`);
  const platformId = platformOf(source, ctx.platforms)?.id ?? null;

  return (
    <Modal title={`${source.label} — geçmiş yüklemeler`} onClose={onClose} wide>
      <div className="upload-history-toolbar">
        <span className="ui-muted">Gün sayısı</span>
        <div className="ui-chip-group" role="group" aria-label="Gün sayısı">
          {DAY_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              className={`ui-button small${days === choice ? "" : " ghost"}`}
              onClick={() => setDays(choice)}
            >
              {choice} gün
            </button>
          ))}
        </div>
      </div>
      <AsyncState {...uploads}>
        {(rows) => {
          const dayRows = buildDays(days, rows, source, platformId);
          const missing = dayRows.filter((d) => !d.upload).length;
          return (
            <>
              <p className="ui-muted">
                Son {days} günün {days - missing} günü yüklü{missing > 0 ? `, ${missing} günü eksik` : ""}.
              </p>
              <DataTable
                rows={dayRows}
                rowKey={(row) => row.date}
                rowClassName={(row) => (row.upload ? undefined : "upload-history-missing")}
                columns={[
                  { header: "Gün", render: (row) => <span className="ui-cell-strong">{formatDate(row.date)}</span> },
                  {
                    header: "Durum",
                    render: (row) =>
                      row.upload ? (
                        <StatusBadge tone="success">
                          <CircleCheck size={13} aria-hidden="true" /> Yüklendi
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="warning">Yüklenmedi</StatusBadge>
                      ),
                  },
                  { header: "Satır", align: "right", render: (row) => (row.upload ? String(row.upload.rowCount) : "—") },
                  { header: "Tutar", align: "right", render: (row) => (row.upload ? <Money value={row.upload.totalAmount} /> : "—") },
                  { header: "Yükleme saati", render: (row) => (row.upload ? formatRecordedAt(row.upload.lastUploadedAtUtc, row.date) : "—") },
                ]}
                rowActions={(row) => (
                  <button type="button" className={`ui-button small${row.upload ? " ghost" : ""}`} onClick={() => onUploadDay(row.date)}>
                    <Upload size={14} aria-hidden="true" />
                    {row.upload ? "Yeniden yükle" : "Yükle"}
                  </button>
                )}
              />
            </>
          );
        }}
      </AsyncState>
    </Modal>
  );
}
