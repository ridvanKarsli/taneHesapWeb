import { CalendarClock } from "lucide-react";
import { recurringExpenseApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { Money } from "../../components/ui/Money";
import { Section } from "../../components/ui/Section";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDate, todayIso } from "../../lib/format";
import { recurringScheduleLabel } from "../../types/enums";
import type { RecurringUpcomingDto } from "../../types/recurringExpense";

interface RecurringUpcomingProps {
  reloadKey: string;
}

const MONTH_NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

/** Yıl sonu (31 Aralık). */
function endOfYearIso(isoDate: string): string {
  return `${isoDate.slice(0, 4)}-12-31`;
}

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function monthTitle(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * "Yaklaşan ödemeler": bugünden sonra başlayan dönemler, yıl sonuna kadar, ay ay gruplanmış (en yakın ay üstte,
 * ay içinde ilk ödenecek önce). Henüz ödeme yapılmaz; ay geldiğinde satır yukarıdaki "Bu ay ödenecekler"e düşer.
 */
export function RecurringUpcoming({ reloadKey }: RecurringUpcomingProps) {
  const today = todayIso();
  const upcoming = useAsyncData(() => recurringExpenseApi.getUpcoming(endOfYearIso(today)), `${today}|${reloadKey}`);

  return (
    <Section title={`Yaklaşan ödemeler (${today.slice(0, 4)} sonuna kadar)`} icon={CalendarClock}>
      <AsyncState {...upcoming} isEmpty={(rows) => rows.length === 0} emptyText="Yıl sonuna kadar başka düzenli ödeme yok.">
        {(rows) => <UpcomingByMonth rows={rows} />}
      </AsyncState>
    </Section>
  );
}

function UpcomingByMonth({ rows }: { rows: RecurringUpcomingDto[] }) {
  // Sunucu tarih sırasıyla verir; aylara bölünür, sıra korunur.
  const groups = new Map<string, RecurringUpcomingDto[]>();
  for (const row of rows) {
    const key = monthKey(row.periodStartDate);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return (
    <div className="upcoming-months">
      {[...groups.entries()].map(([key, items]) => (
        <section key={key} className="upcoming-month" aria-label={monthTitle(key)}>
          <header className="upcoming-month-head">
            <strong>{monthTitle(key)}</strong>
            <span>
              {items.length} ödeme · <Money value={items.reduce((sum, r) => sum + r.amount, 0)} />
            </span>
          </header>
          <ul className="upcoming-list">
            {items.map((row) => (
              <li key={`${row.recurringExpenseId}-${row.periodStartDate}`} className="upcoming-row">
                <div>
                  <strong>{row.name}</strong>
                  <span>
                    {formatDate(row.periodStartDate)} – {formatDate(row.periodEndDate)} · {recurringScheduleLabel(row.period, row.intervalCount)}
                  </span>
                </div>
                <Money value={row.amount} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
