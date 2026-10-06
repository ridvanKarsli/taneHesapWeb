import type { ImportRowRequest } from "../types/dailySales";
import { PaymentMethod, SalesChannel } from "../types/enums";
import { cellToDateTime } from "./excelReader";
import { ProductMatcher } from "./productMatcher";
import type { CellValue, ParsedSales, SheetFormat, UnmatchedProduct } from "./salesExcel";

/** Eşleşmeyen ürünleri ad bazında toplar (adet toplanır, ilk görülen birim fiyat tutulur). */
class UnmatchedCollector {
  private readonly items = new Map<string, UnmatchedProduct>();

  add(name: string, quantity: number, unitPrice: number | null): void {
    const existing = this.items.get(name);
    if (existing) {
      existing.quantity += quantity;
      existing.unitPrice ??= unitPrice;
    } else {
      this.items.set(name, { name, quantity, unitPrice });
    }
  }

  list(): UnmatchedProduct[] {
    return [...this.items.values()];
  }
}

/**
 * Paket servis platformlarının kendi dışa aktarım dosyaları (şablon yok; dosya panelden indirildiği gibi yüklenir).
 * İki dosyadan da yalnızca ortak alanlar alınır: sipariş no, tarih-saat, durum, ödeme yöntemi, ürün + adet + tutar.
 * Komisyon dosyadan okunmaz; sistemdeki platform yüzdesinden hesaplanır (bkz. Gün Sonu → Paket Servis).
 * Kapıda nakit ödenen sipariş nakit kasasına, diğerleri (online / kapıda kart) banka hesabına yazılır.
 */

const DELIVERED = "teslim edildi";

const normalizeHeader = (value: CellValue) => String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");

/** Başlık satırında verilen sütunların hepsi varsa sütun → indeks haritası, yoksa null. */
function headerMap(row: CellValue[] | undefined, required: string[]): Map<string, number> | null {
  if (!row) {
    return null;
  }
  const map = new Map<string, number>();
  row.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    if (key && !map.has(key)) {
      map.set(key, index);
    }
  });
  return required.every((name) => map.has(normalizeHeader(name))) ? map : null;
}

const cellOf = (row: CellValue[], map: Map<string, number>, name: string): CellValue => {
  const index = map.get(normalizeHeader(name));
  return index === undefined ? null : row[index];
};

const text = (value: CellValue) => String(value ?? "").trim();
const numberOf = (value: CellValue): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(text(value).replace(/[₺\s]/g, "").replace(",", "."));
  return text(value) !== "" && Number.isFinite(parsed) ? parsed : null;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- Trendyol Go (Uber Eats kuryeli) — satır başına bir ürün ----------

const TRENDYOL_REQUIRED = ["Sipariş Tarihi", "Sipariş Numarası", "Ürün Adı", "Adet", "Birim Fiyatı"];

export function looksLikeTrendyolSheet(sheet: CellValue[][]): boolean {
  return headerMap(sheet[0], TRENDYOL_REQUIRED) !== null;
}

export function parseTrendyolSheet(sheet: CellValue[][], matcher: ProductMatcher, format: SheetFormat): ParsedSales {
  const map = headerMap(sheet[0], TRENDYOL_REQUIRED);
  if (!map) {
    return { rows: [], errors: ["Bu dosya Trendyol Go sipariş dökümüne benzemiyor (Sipariş Tarihi, Sipariş Numarası, Ürün Adı, Adet, Birim Fiyatı sütunları bekleniyor)."] };
  }

  const rows: ImportRowRequest[] = [];
  const errors: string[] = [];
  const unmatched = new UnmatchedCollector();

  sheet.slice(1).forEach((cells, i) => {
    const rowNo = i + 2;
    if (cells.every((c) => text(c) === "")) {
      return;
    }
    const status = normalizeHeader(cellOf(cells, map, "Sipariş Statüsü"));
    if (status && status !== DELIVERED) {
      return; // iptal / teslim edilmemiş sipariş: ciro yok
    }

    const when = cellToDateTime(cellOf(cells, map, "Sipariş Tarihi"));
    const productName = text(cellOf(cells, map, "Ürün Adı"));
    const quantity = numberOf(cellOf(cells, map, "Adet"));
    const unitPrice = numberOf(cellOf(cells, map, "Birim Fiyatı"));
    const problems: string[] = [];
    if (!when) problems.push("sipariş tarihi okunamadı");
    if (!productName) problems.push("ürün adı boş");
    if (!quantity || quantity <= 0) problems.push("adet 0'dan büyük olmalı");
    if (unitPrice === null || unitPrice < 0) problems.push("birim fiyat okunamadı");
    if (problems.length > 0 || !when || !quantity || unitPrice === null) {
      errors.push(`Satır ${rowNo}: ${problems.join("; ")}.`);
      return;
    }

    const match = matcher.match(productName);
    if (!match) {
      unmatched.add(productName, Math.round(quantity), unitPrice);
    }
    rows.push({
      saleDate: when.date,
      saleTime: when.time,
      dishSizeId: match?.size.id ?? null,
      productName,
      externalOrderNumber: text(cellOf(cells, map, "Sipariş Numarası")) || null,
      quantity: Math.round(quantity),
      totalAmount: round2(unitPrice * quantity),
      paymentMethod: normalizeHeader(cellOf(cells, map, "Ödeme Yöntemi")).includes("nakit") ? PaymentMethod.Cash : PaymentMethod.Card,
      channel: SalesChannel.Platform,
      platformId: format.platformId,
      discountAmount: null,
    });
  });

  return { rows, errors, unmatchedProducts: unmatched.list() };
}

// ---------- Yemeksepeti — satır başına bir sipariş, ürünler tek metinde ----------

const YEMEKSEPETI_REQUIRED = ["Sipariş No", "Siparişin Alındığı Zaman", "Ara Toplam", "Sipariş Ürünleri"];

/** Yemeksepeti'nde başlık 2. satırdadır (1. satır grup adları); yine de ilk üç satırda aranır. */
function yemeksepetiHeader(sheet: CellValue[][]): { map: Map<string, number>; headerIndex: number } | null {
  for (let i = 0; i < Math.min(3, sheet.length); i++) {
    const map = headerMap(sheet[i], YEMEKSEPETI_REQUIRED);
    if (map) {
      return { map, headerIndex: i };
    }
  }
  return null;
}

export function looksLikeYemeksepetiSheet(sheet: CellValue[][]): boolean {
  return yemeksepetiHeader(sheet) !== null;
}

/** "1 Tavuklu Pilav (1 Porsiyon), 2 Eker Ayran (27 cl.)" → [{ quantity, name }]. Parantez içindeki virgül ayırıcı sayılmaz. */
export function splitOrderItems(value: string): { quantity: number; name: string }[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);

  return parts
    .map((p) => p.trim())
    .filter((p) => p !== "")
    .map((p) => {
      const m = /^(\d+)\s*[xX×]?\s+(.+)$/.exec(p);
      return m ? { quantity: Number(m[1]), name: m[2].trim() } : { quantity: 1, name: p };
    });
}

export function parseYemeksepetiSheet(sheet: CellValue[][], matcher: ProductMatcher, format: SheetFormat): ParsedSales {
  const header = yemeksepetiHeader(sheet);
  if (!header) {
    return { rows: [], errors: ["Bu dosya Yemeksepeti sipariş raporuna benzemiyor (Sipariş No, Siparişin Alındığı Zaman, Ara Toplam, Sipariş Ürünleri sütunları bekleniyor)."] };
  }
  const { map, headerIndex } = header;

  const rows: ImportRowRequest[] = [];
  const errors: string[] = [];
  const unmatched = new UnmatchedCollector();

  sheet.slice(headerIndex + 1).forEach((cells, i) => {
    const rowNo = headerIndex + i + 2;
    if (cells.every((c) => text(c) === "")) {
      return;
    }
    const status = normalizeHeader(cellOf(cells, map, "Sipariş Durumu"));
    if (status && status !== DELIVERED) {
      return;
    }

    const when = cellToDateTime(cellOf(cells, map, "Siparişin Alındığı Zaman"));
    const subtotal = numberOf(cellOf(cells, map, "Ara Toplam"));
    const items = splitOrderItems(text(cellOf(cells, map, "Sipariş Ürünleri")));
    const problems: string[] = [];
    if (!when) problems.push("sipariş zamanı okunamadı");
    if (subtotal === null || subtotal < 0) problems.push("ara toplam okunamadı");
    if (items.length === 0) problems.push("sipariş ürünleri boş");
    if (problems.length > 0 || !when || subtotal === null) {
      errors.push(`Satır ${rowNo}: ${problems.join("; ")}.`);
      return;
    }

    const orderNumber = text(cellOf(cells, map, "Sipariş No")) || null;
    const paymentMethod = normalizeHeader(cellOf(cells, map, "Ödeme Yöntemi")) === "cash" ? PaymentMethod.Cash : PaymentMethod.Card;

    // Dosyada ürün başına fiyat yok: eşleşen ürünler sistemdeki satış fiyatıyla, kalan (fiyat farkı ya da
    // eşleşmeyen ürünler) son satıra yazılır — satırların toplamı her zaman Ara Toplam'a eşittir.
    const matched = items.map((item) => ({ item, match: matcher.match(item.name) }));
    const amounts = matched.map(({ item, match }) => (match ? round2(match.size.salePrice * item.quantity) : 0));
    const unmatchedIndexes = matched.map((m, index) => (m.match ? -1 : index)).filter((index) => index >= 0);
    const remainder = round2(subtotal - amounts.reduce((sum, a) => sum + a, 0));
    const targets = unmatchedIndexes.length > 0 ? unmatchedIndexes : [amounts.length - 1];
    const share = round2(remainder / targets.length);
    targets.forEach((index, k) => {
      amounts[index] = round2(amounts[index] + (k === targets.length - 1 ? remainder - share * (targets.length - 1) : share));
    });

    matched.forEach(({ item, match }, index) => {
      if (!match) {
        unmatched.add(item.name, item.quantity, null); // Yemeksepeti'nde ürün başına fiyat yok
      }
      rows.push({
        saleDate: when.date,
        saleTime: when.time,
        dishSizeId: match?.size.id ?? null,
        productName: item.name,
        externalOrderNumber: orderNumber,
        quantity: item.quantity,
        totalAmount: Math.max(0, amounts[index]),
        paymentMethod,
        channel: SalesChannel.Platform,
        platformId: format.platformId,
        discountAmount: null,
      });
    });
  });

  return { rows, errors, unmatchedProducts: unmatched.list() };
}
