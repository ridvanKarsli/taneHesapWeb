import { History } from "lucide-react";
import { incomeVerificationApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { Money } from "../../components/ui/Money";
import { Section } from "../../components/ui/Section";
import { useAsyncData } from "../../hooks/useAsyncData";
import { addDaysIso, formatDate, todayIso } from "../../lib/format";
import type { IncomeVerificationDayDto } from "../../types/incomeVerification";

const HISTORY_DAYS = 30;

interface IncomeVerificationHistoryProps {
  reloadKey: string;
  /** Satıra tıklanınca o gün açılır. */
  onPick: (date: string) => void;
}

const differenceOf = (d: IncomeVerificationDayDto) => (d.cashDifference ?? 0) + (d.cardDifference ?? 0);

function SignedMoney({ value }: { value: number }) {
  if (value === 0) {
    return <span className="ui-muted">Fark yok</span>;
  }
  return (
    <span className={value < 0 ? "ui-text-negative" : "ui-text-positive"}>
      {value > 0 ? "+" : ""}
      <Money value={value} />
    </span>
  );
}

/** Son 30 günün doğrulamaları ve farkları (kasa açığı/fazlası raporu). */
export function IncomeVerificationHistory({ reloadKey, onPick }: IncomeVerificationHistoryProps) {
  const today = todayIso();
  const history = useAsyncData(() => incomeVerificationApi.getVerified(addDaysIso(today, -HISTORY_DAYS), today), `${today}|${reloadKey}`);
  const rows = history.data ?? [];
  const totalDifference = rows.reduce((sum, d) => sum + differenceOf(d), 0);
  const daysWithDifference = rows.filter((d) => differenceOf(d) !== 0).length;

  return (
    <Section
      title={`Doğrulama geçmişi (son ${HISTORY_DAYS} gün)`}
      icon={History}
      actions={
        rows.length > 0 && (
          <span className="verify-summary">
            {daysWithDifference} günde fark · toplam <SignedMoney value={totalDifference} />
          </span>
        )
      }
    >
      <AsyncState {...history} isEmpty={(r) => r.length === 0} emptyText="Henüz doğrulanmış gün yok.">
        {(r) => (
          <DataTable
            rows={r}
            rowKey={(row) => row.date}
            columns={[
              { header: "Tarih", render: (row) => formatDate(row.date) },
              { header: "Beklenen", align: "right", render: (row) => <Money value={row.expectedCash + row.expectedCard} /> },
              { header: "Gerçek", align: "right", render: (row) => <Money value={(row.actualCash ?? 0) + (row.actualCard ?? 0)} /> },
              { header: "Nakit farkı", align: "right", render: (row) => <SignedMoney value={row.cashDifference ?? 0} /> },
              { header: "Kart farkı", align: "right", render: (row) => <SignedMoney value={row.cardDifference ?? 0} /> },
              { header: "Not", render: (row) => row.note || "—" },
            ]}
            rowActions={(row) => (
              <button type="button" className="ui-button secondary small" onClick={() => onPick(row.date)}>
                Aç
              </button>
            )}
          />
        )}
      </AsyncState>
    </Section>
  );
}
