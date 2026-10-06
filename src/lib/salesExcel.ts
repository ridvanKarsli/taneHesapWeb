import type { ImportRowRequest } from "../types/dailySales";
import type { DishDto } from "../types/dish";
import { PaymentMethod, SalesChannel } from "../types/enums";

/**
 * Kasa (dükkân içi) satış sayfası: kolon tanımları ve yüklenen sayfanın backend `ImportRowRequest` satırlarına
 * çevrilmesi. Gerçek kasa dökümü gelene kadar bu biçim kullanılır (Tarih, Saat, Ürün, Boy, Adet, Tutar, Ödeme, İndirim).
 * Platform dosyaları için bkz. `platformSheets.ts`. Excel kütüphanesinden bağımsız saf fonksiyonlardır.
 */

export const SALES_COLUMNS = ["Tarih", "Saat", "Ürün", "Boy", "Adet", "Tutar", "Ödeme", "İndirim"] as const;
type SalesColumn = (typeof SALES_COLUMNS)[number];

/** Yüklenen kaynağın sabitleri: satırlar bu kanala/platforma yazılır; ödeme sütunu boşsa varsayılan kullanılır. */
export interface SheetFormat {
  channel: SalesChannel;
  platformId: string | null;
  defaultPayment: PaymentMethod;
}

export type CellValue = string | number | boolean | Date | null | undefined;

export interface UnmatchedProduct {
  name: string;
  quantity: number;
  unitPrice: number | null;
}

/** Dosyadan çözülen satır: ürün sistemde eşleşmediyse `dishSizeId` null'dır — dosya bu hâlde kaydedilemez. */
export type ParsedRow = Omit<ImportRowRequest, "dishSizeId"> & { dishSizeId: string | null };

export interface ParsedSales {
  rows: ParsedRow[];
  errors: string[];
  /**
   * Ürünler listesinde olmayan ürünler. Dosya reddedilir: kullanıcı bunları Mutfak ve Stok → Ürünler'e ekleyip dosyayı
   * yeniden yükler. `unitPrice` dosyadan okunabildiyse (Trendyol Go) bilgi için gösterilir.
   */
  unmatchedProducts?: UnmatchedProduct[];
}

/** Tüm satırlar eşleşmişse backend satırları; bir tane bile eşleşmeyen varsa null (kaydedilemez). */
export function toImportRows(rows: ParsedRow[]): ImportRowRequest[] | null {
  return rows.every((r) => r.dishSizeId !== null) ? (rows as ImportRowRequest[]) : null;
}

const PAYMENT_ALIASES: Record<string, PaymentMethod> = {
  nakit: PaymentMethod.Cash,
  cash: PaymentMethod.Cash,
  kart: PaymentMethod.Card,
  "kredi kartı": PaymentMethod.Card,
  card: PaymentMethod.Card,
};

function normalize(value: CellValue): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Hücredeki tarihi `yyyy-MM-dd`'ye çevirir: Excel tarihi, `gg.aa.yyyy` veya `yyyy-aa-gg`.
 * Excel tarih/saat hücreleri saat dilimi içermez; okuma kütüphanesi bunları UTC olarak verdiği için
 * UTC bileşenleri kullanılır (tarayıcının saat dilimine göre bir gün kaymasın).
 */
function toIsoDate(value: CellValue): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  const text = String(value ?? "").trim();
  const tr = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(text);
  if (tr) {
    return `${tr[3]}-${pad(Number(tr[2]))}-${pad(Number(tr[1]))}`;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

/** Hücredeki saati `HH:mm:ss`'e çevirir (boşsa null). */
function toTime(value: CellValue): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:00`;
  }
  const match = /^(\d{1,2})[:.](\d{2})$/.exec(String(value ?? "").trim());
  return match ? `${pad(Number(match[1]))}:${match[2]}:00` : null;
}

function toNumber(value: CellValue): number | null {
  if (typeof value === "number") {
    return value;
  }
  const text = String(value ?? "")
    .trim()
    .replace(/[₺\s]/g, "");
  if (text === "") {
    return null;
  }
  // "1.250,50" (tr) ve "1250.50" biçimlerini destekle.
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Yüklenen satış sayfasını backend satırlarına çevirir. İlk satır başlıktır; kolon sırası
 * önemsizdir (başlık adıyla eşleşir). Hatalı satırlar atlanır ve satır numarasıyla raporlanır.
 */
export function parseSalesSheet(sheet: CellValue[][], dishes: DishDto[], format: SheetFormat): ParsedSales {
  const [header = [], ...body] = sheet;
  const columnIndex = new Map<SalesColumn, number>();
  header.forEach((cell, index) => {
    const column = SALES_COLUMNS.find((c) => normalize(c) === normalize(cell));
    if (column) {
      columnIndex.set(column, index);
    }
  });

  const missing = (["Tarih", "Ürün", "Boy", "Adet"] as const).filter((c) => !columnIndex.has(c));
  if (missing.length > 0) {
    return { rows: [], errors: [`Kasa dosyasında başlıklar eksik: ${missing.join(", ")} (Tarih, Saat, Ürün, Boy, Adet, Tutar, Ödeme, İndirim bekleniyor).`] };
  }

  const sizeByKey = new Map(
    dishes.flatMap((dish) => dish.sizes.map((size) => [`${normalize(dish.name)}|${normalize(size.name)}`, size] as const)),
  );
  if (format.channel === SalesChannel.Platform && !format.platformId) {
    return { rows: [], errors: ["Bu paket servis platformu henüz tanımlı değil; sistem yöneticinizin komisyon oranıyla eklemesi gerekiyor."] };
  }

  const rows: ParsedRow[] = [];
  const errors: string[] = [];

  body.forEach((cells, i) => {
    const rowNo = i + 2;
    const cell = (column: SalesColumn): CellValue => {
      const index = columnIndex.get(column);
      return index === undefined ? null : cells[index];
    };

    if (cells.every((c) => normalize(c) === "")) {
      return; // boş satır
    }

    const problems: string[] = [];
    const saleDate = toIsoDate(cell("Tarih"));
    if (!saleDate) problems.push("tarih okunamadı");

    const size = sizeByKey.get(`${normalize(cell("Ürün"))}|${normalize(cell("Boy"))}`);
    if (!size) problems.push(`"${cell("Ürün") ?? ""} / ${cell("Boy") ?? ""}" tanımlı bir ürün-boy değil`);

    const quantity = toNumber(cell("Adet"));
    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) problems.push("adet pozitif tam sayı olmalı");

    const paymentText = normalize(cell("Ödeme"));
    const paymentMethod = paymentText === "" ? format.defaultPayment : PAYMENT_ALIASES[paymentText];
    if (paymentMethod === undefined) problems.push(`ödeme "${cell("Ödeme")}" anlaşılamadı (Nakit/Kart)`);

    if (problems.length > 0 || !saleDate || !size || !quantity || paymentMethod === undefined) {
      errors.push(`Satır ${rowNo}: ${problems.join("; ")}.`);
      return;
    }

    rows.push({
      saleDate,
      saleTime: toTime(cell("Saat")),
      dishSizeId: size.id,
      productName: `${cell("Ürün") ?? ""} ${cell("Boy") ?? ""}`.trim(),
      externalOrderNumber: null,
      quantity,
      // Tutar boşsa fiyat × adet − indirim (net tahsilat); doluysa girilen değer nettir.
      totalAmount: toNumber(cell("Tutar")) ?? Math.max(0, size.salePrice * quantity - (toNumber(cell("İndirim")) ?? 0)),
      paymentMethod,
      channel: format.channel,
      platformId: format.channel === SalesChannel.Platform ? format.platformId : null,
      discountAmount: toNumber(cell("İndirim")),
    });
  });

  return { rows, errors };
}
