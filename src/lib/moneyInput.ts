/**
 * Tutar kutularının biçimi: binlik ayırıcı nokta, kuruş ayırıcı virgül ("1.250.000,50"). Form değeri ise
 * her zaman makine biçimindedir ("1250000.5") — sayfalar ve backend isteği bundan etkilenmez.
 */

const MAX_DECIMALS = 2;

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Kutuda görünen metin → form değeri ("1.250,5" → "1250.5"). */
export function moneyDisplayToValue(display: string): string {
  return display.replace(/\./g, "").replace(",", ".");
}

/** Form değeri → kutuda görünen metin ("1250.5" → "1.250,5"). */
export function moneyValueToDisplay(value: string): string {
  if (value.trim() === "") {
    return "";
  }
  const [intPart, decPart] = value.split(".");
  const digits = intPart.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return decPart === undefined ? groupThousands(digits) : `${groupThousands(digits)},${decPart.slice(0, MAX_DECIMALS)}`;
}

/**
 * Kullanıcının yazdığını yeniden biçimler. Noktalar binlik ayırıcı sayılır (kutu onları kendisi koyar); tek istisna
 * sona yeni yazılan nokta — mobil klavyede kuruş için "." basan kullanıcı içindir, virgüle çevrilir.
 */
export function formatMoneyTyping(raw: string, previousDisplay: string): string {
  let text = raw;
  if (text.endsWith(".") && !text.includes(",") && raw.length > previousDisplay.length) {
    text = `${text.slice(0, -1)},`;
  }

  const commaAt = text.indexOf(",");
  const intDigits = (commaAt === -1 ? text : text.slice(0, commaAt)).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (commaAt === -1) {
    return groupThousands(intDigits);
  }
  const decDigits = text.slice(commaAt + 1).replace(/\D/g, "").slice(0, MAX_DECIMALS);
  return `${groupThousands(intDigits || "0")},${decDigits}`;
}

/**
 * Yapıştırılan metni yorumlar: "1.250,50" (Türkçe), "1250.50" / "1,250.50" (İngilizce) ve "₺ 1.250" hepsi
 * doğru okunur. Son ayırıcının ardından 1-2 hane varsa o kuruş ayırıcıdır.
 */
export function parsePastedMoney(text: string): string {
  const cleaned = text.replace(/[^\d.,]/g, "");
  const lastSep = Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf("."));
  const tail = lastSep === -1 ? "" : cleaned.slice(lastSep + 1);
  const hasDecimals = lastSep !== -1 && tail.length > 0 && tail.length <= MAX_DECIMALS;
  const intDigits = (hasDecimals ? cleaned.slice(0, lastSep) : cleaned).replace(/\D/g, "");
  const value = hasDecimals ? `${intDigits || "0"}.${tail}` : intDigits;
  return moneyValueToDisplay(value);
}

/** İmleç konumunu korumak için: metnin ilk `position` karakterindeki anlamlı karakter (rakam, virgül) sayısı. */
export function significantCharsBefore(text: string, position: number): number {
  return text.slice(0, position).replace(/[^\d,]/g, "").length;
}

/** `count` anlamlı karakterden hemen sonraki konum. */
export function positionAfterSignificant(text: string, count: number): number {
  if (count <= 0) {
    return 0;
  }
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/[\d,]/.test(text[i])) {
      seen++;
      if (seen === count) {
        return i + 1;
      }
    }
  }
  return text.length;
}
