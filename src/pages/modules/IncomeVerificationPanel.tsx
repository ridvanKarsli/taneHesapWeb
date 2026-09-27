import { BadgeCheck, Undo2 } from "lucide-react";
import { useState } from "react";
import { extractErrorMessage } from "../../api/apiError";
import { incomeVerificationApi } from "../../api/moduleApis";
import { AsyncState, ErrorMessage } from "../../components/ui/AsyncState";
import { Money } from "../../components/ui/Money";
import { MoneyInput } from "../../components/ui/MoneyInput";
import { Section } from "../../components/ui/Section";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDate } from "../../lib/format";
import type { IncomeVerificationDayDto } from "../../types/incomeVerification";

interface IncomeVerificationPanelProps {
  date: string;
  /** Satışlar değişince (Excel yüklendi/silindi) beklenen tutarlar yeniden okunur. */
  reloadKey: string;
  onChanged: () => void;
}

/**
 * Gün sonunun ikinci adımı: Kasa Excel'inden beklenen dükkân içi nakit/kart geliri ile kasadan sayılan nakit ve
 * POS'taki kart toplamı karşılaştırılır. Kaydedince nakit kasasına ve banka hesabına gerçek tutarlar yazılır,
 * raporlardaki gelir de bu olur. Paket servis (Yemeksepeti, Uber) kapsam dışıdır.
 */
export function IncomeVerificationPanel({ date, reloadKey, onChanged }: IncomeVerificationPanelProps) {
  const day = useAsyncData(() => incomeVerificationApi.getDay(date), `${date}|${reloadKey}`);

  return (
    <Section
      title="2. Gelir doğrulama"
      icon={BadgeCheck}
      actions={
        day.data?.hasInStoreSales &&
        (day.data.isVerified ? <StatusBadge tone="success">Doğrulandı</StatusBadge> : <StatusBadge tone="warning">Bekliyor</StatusBadge>)
      }
    >
      <AsyncState {...day}>
        {(d) =>
          d.hasInStoreSales ? (
            <VerificationForm
              key={`${d.date}|${d.verifiedAtUtc ?? ""}|${d.expectedCash}|${d.expectedCard}`}
              day={d}
              onSaved={async () => {
                await day.reload();
                onChanged();
              }}
            />
          ) : (
            <p className="ui-muted">
              {formatDate(date)} için önce Kasa Excel'ini yükleyin — beklenen nakit ve kart geliri oradan hesaplanır, sonra kasadaki gerçek
              tutarı buraya girersiniz.
            </p>
          )
        }
      </AsyncState>
    </Section>
  );
}

function parse(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function Difference({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="ui-muted">—</span>;
  }
  if (value === 0) {
    return <span className="verify-diff">Fark yok</span>;
  }
  return (
    <span className={`verify-diff ${value < 0 ? "ui-text-negative" : "ui-text-positive"}`}>
      {value > 0 ? "+" : ""}
      <Money value={value} /> {value < 0 ? "eksik" : "fazla"}
    </span>
  );
}

function VerificationForm({ day, onSaved }: { day: IncomeVerificationDayDto; onSaved: () => Promise<void> }) {
  const [cash, setCash] = useState(day.actualCash === null ? "" : String(day.actualCash));
  const [card, setCard] = useState(day.actualCard === null ? "" : String(day.actualCard));
  const [note, setNote] = useState(day.note ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actualCash = parse(cash);
  const actualCard = parse(card);
  const cashDiff = actualCash === null ? null : actualCash - day.expectedCash;
  const cardDiff = actualCard === null ? null : actualCard - day.expectedCard;
  const totalDiff = cashDiff === null || cardDiff === null ? null : cashDiff + cardDiff;

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setIsBusy(true);
    try {
      await action();
      await onSaved();
    } catch (actionError) {
      setError(extractErrorMessage(actionError));
    } finally {
      setIsBusy(false);
    }
  }

  function save() {
    if (actualCash === null || actualCard === null) {
      setError("Gerçek nakit ve kart tutarını girin (hiç yoksa 0 yazın).");
      return;
    }
    void run(() => incomeVerificationApi.save(day.date, { actualCash, actualCard, note: note.trim() || null }));
  }

  return (
    <div className="verify">
      <div className="verify-grid" role="table" aria-label="Beklenen ve gerçek gelir">
        <div className="verify-head" role="row">
          <span role="columnheader" />
          <span role="columnheader">Beklenen (Kasa Excel'i)</span>
          <span role="columnheader">Gerçek</span>
          <span role="columnheader">Fark</span>
        </div>
        <div className="verify-row" role="row">
          <strong role="rowheader">Nakit</strong>
          <span role="cell" data-label="Beklenen">
            <Money value={day.expectedCash} />
          </span>
          <span role="cell" data-label="Gerçek">
            <MoneyInput id="verify-cash" aria-label="Kasadan sayılan nakit" value={cash} onChange={setCash} placeholder="Sayılan nakit" />
          </span>
          <span role="cell" data-label="Fark">
            <Difference value={cashDiff} />
          </span>
        </div>
        <div className="verify-row" role="row">
          <strong role="rowheader">Kart (POS)</strong>
          <span role="cell" data-label="Beklenen">
            <Money value={day.expectedCard} />
          </span>
          <span role="cell" data-label="Gerçek">
            <MoneyInput id="verify-card" aria-label="POS'taki kart toplamı" value={card} onChange={setCard} placeholder="POS toplamı" />
          </span>
          <span role="cell" data-label="Fark">
            <Difference value={cardDiff} />
          </span>
        </div>
        <div className="verify-row total" role="row">
          <strong role="rowheader">Toplam</strong>
          <span role="cell" data-label="Beklenen">
            <Money value={day.expectedCash + day.expectedCard} />
          </span>
          <span role="cell" data-label="Gerçek">
            {actualCash === null || actualCard === null ? <span className="ui-muted">—</span> : <Money value={actualCash + actualCard} />}
          </span>
          <span role="cell" data-label="Fark">
            <Difference value={totalDiff} />
          </span>
        </div>
      </div>

      <div className="verify-actions">
        <label className="payable-field" htmlFor="verify-note">
          <span>Not (opsiyonel)</span>
          <input id="verify-note" className="ui-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="örn. 50 ₺ bozuk para eksik" />
        </label>
        <button type="button" className="ui-button" onClick={save} disabled={isBusy}>
          <BadgeCheck size={16} aria-hidden="true" />
          {isBusy ? "Kaydediliyor…" : day.isVerified ? "Güncelle" : "Doğrula ve kasaya yaz"}
        </button>
        {day.isVerified && (
          <button
            type="button"
            className="ui-button ghost"
            disabled={isBusy}
            onClick={() => void run(() => incomeVerificationApi.remove(day.date))}
          >
            <Undo2 size={16} aria-hidden="true" />
            Doğrulamayı kaldır
          </button>
        )}
      </div>
      <p className="ui-muted verify-note">
        {day.isVerified
          ? "Nakit kasasına ve banka hesabına bu gerçek tutarlar yazıldı; raporlardaki gelir de bu tutarlardır."
          : "Kaydedene kadar kasada Excel'deki beklenen tutar durur. Kaydedince yerine gerçek tutar yazılır, fark aşağıdaki geçmişte görünür."}
      </p>
      {error && <ErrorMessage message={error} />}
    </div>
  );
}
