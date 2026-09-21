/**
 * Para/sayı/tarih biçimlendirme ve tarih yardımcıları — tüm sayfalar aynı biçimi kullanır (tek kaynak).
 * Backend `DateOnly` alanları `yyyy-MM-dd` dizesi olarak gelir/gider; bunlar saat dilimi kaymasına
 * uğramasın diye `Date` nesnesine çevrilmeden, dize üzerinden işlenir.
 */

const moneyFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

export function formatMoney(value: number): string {
  return moneyFormatter.format(value);
}

export function formatNumber(value: number, maximumFractionDigits = 3): string {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits }).format(value);
}

export function formatPercent(value: number): string {
  return `%${formatNumber(value, 2)}`;
}

/** `yyyy-MM-dd` → `gg.aa.yyyy` */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
}

export function formatDateTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

function toIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromIso(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function todayIso(): string {
  return toIso(new Date());
}

export function addDaysIso(isoDate: string, days: number): string {
  const date = fromIso(isoDate);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

/** Pazartesi başlangıçlı hafta. */
export function startOfWeekIso(isoDate: string): string {
  const date = fromIso(isoDate);
  const mondayOffset = (date.getDay() + 6) % 7;
  return addDaysIso(isoDate, -mondayOffset);
}

export function startOfMonthIso(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}
