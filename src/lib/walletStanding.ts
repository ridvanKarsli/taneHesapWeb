/**
 * Çalışan cüzdanının durumu tek yerde: bakiye = hak ediş − ödenen.
 * Pozitif → çalışan ALACAKLI (işletme ona ödeyecek); negatif → çalışan BORÇLU (fazla ödenmiş); sıfır → hesap kapalı.
 */
export type WalletStanding = { label: "Alacaklı" | "Borçlu" | "Hesap kapalı"; amount: number; tone: "positive" | "negative" | undefined };

export function walletStanding(balance: number): WalletStanding {
  if (balance > 0) return { label: "Alacaklı", amount: balance, tone: "positive" };
  if (balance < 0) return { label: "Borçlu", amount: -balance, tone: "negative" };
  return { label: "Hesap kapalı", amount: 0, tone: undefined };
}
