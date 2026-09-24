import type { ImportRowRequest } from "../types/dailySales";
import type { DishDto } from "../types/dish";
import { PaymentMethod, SalesChannel } from "../types/enums";
import type { PlatformDto } from "../types/platform";

/**
 * Gün sonu satış Excel şablonu: kolon tanımları, şablon verisi ve yüklenen dosyanın backend
 * `ImportRowRequest` satırlarına çevrilmesi. Excel okuma/yazma kütüphanesinden bağımsız saf
 * fonksiyonlardır (Single Responsibility) — dosya işlemleri `SalesExcelImport` bileşenindedir.
 * Şablon: bkz. proje raporu bölüm 3.5.
 */

export const SALES_COLUMNS = ["Tarih", "Saat", "Ürün", "Boy", "Adet", "Tutar", "Ödeme", "Kanal", "Platform", "İndirim"] as const;
type SalesColumn = (typeof SALES_COLUMNS)[number];

export type CellValue = string | number | boolean | Date | null | undefined;

export interface ParsedSales {
  rows: ImportRowRequest[];
  errors: string[];
}

const PAYMENT_ALIASES: Record<string, PaymentMethod> = {
  nakit: PaymentMethod.Cash,
  cash: PaymentMethod.Cash,
  kart: PaymentMethod.Card,
  "kredi kartı": PaymentMethod.Card,
  card: PaymentMethod.Card,
};

const CHANNEL_ALIASES: Record<string, SalesChannel> = {
  "dükkan içi": SalesChannel.InStore,
  dükkan: SalesChannel.InStore,
  salon: SalesChannel.InStore,
  "paket servis": SalesChannel.Platform,
  paket: SalesChannel.Platform,
  platform: SalesChannel.Platform,
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

/** Şablon dosyasının içeriği: satış sayfası (örnek satırlı) + geçerli ürün/platform listesi. */
export function buildTemplateSheets(dishes: DishDto[], platforms: PlatformDto[], date: string) {
  const activeSizes = dishes
    .filter((dish) => dish.isActive)
    .flatMap((dish) => dish.sizes.filter((size) => size.isActive).map((size) => ({ dish: dish.name, size })));
  const example = activeSizes[0];
  const [year, month, day] = date.split("-");

  const salesSheet: CellValue[][] = [
    [...SALES_COLUMNS],
    example
      ? [`${day}.${month}.${year}`, "12:30", example.dish, example.size.name, 2, example.size.salePrice * 2, "Nakit", "Dükkan içi", "", ""]
      : [],
  ];

  const listSheet: CellValue[][] = [
    ["Ürün", "Boy", "Satış fiyatı", "", "Platform", "", "Ödeme", "Kanal"],
    ...Array.from({ length: Math.max(activeSizes.length, platforms.length, 2) }, (_, i) => [
      activeSizes[i]?.dish ?? "",
      activeSizes[i]?.size.name ?? "",
      activeSizes[i]?.size.salePrice ?? "",
      "",
      platforms.filter((p) => p.isActive)[i]?.name ?? "",
      "",
      ["Nakit", "Kart"][i] ?? "",
      ["Dükkan içi", "Paket servis"][i] ?? "",
    ]),
  ];

  return { salesSheet, listSheet };
}

/**
 * Yüklenen satış sayfasını backend satırlarına çevirir. İlk satır başlıktır; kolon sırası
 * önemsizdir (başlık adıyla eşleşir). Hatalı satırlar atlanır ve satır numarasıyla raporlanır.
 */
export function parseSalesSheet(sheet: CellValue[][], dishes: DishDto[], platforms: PlatformDto[]): ParsedSales {
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
    return { rows: [], errors: [`Şablon başlıkları eksik: ${missing.join(", ")}. Lütfen "Şablonu indir" ile gelen dosyayı kullanın.`] };
  }

  const sizeByKey = new Map(
    dishes.flatMap((dish) => dish.sizes.map((size) => [`${normalize(dish.name)}|${normalize(size.name)}`, size] as const)),
  );
  const platformByName = new Map(platforms.map((p) => [normalize(p.name), p]));

  const rows: ImportRowRequest[] = [];
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
    const paymentMethod = paymentText === "" ? PaymentMethod.Cash : PAYMENT_ALIASES[paymentText];
    if (paymentMethod === undefined) problems.push(`ödeme "${cell("Ödeme")}" anlaşılamadı (Nakit/Kart)`);

    const channelText = normalize(cell("Kanal"));
    const platformText = normalize(cell("Platform"));
    const channel = channelText === "" ? (platformText ? SalesChannel.Platform : SalesChannel.InStore) : CHANNEL_ALIASES[channelText];
    if (channel === undefined) problems.push(`kanal "${cell("Kanal")}" anlaşılamadı (Dükkan içi/Paket servis)`);

    const platform = platformText ? platformByName.get(platformText) : undefined;
    if (channel === SalesChannel.Platform && !platform) problems.push(`platform "${cell("Platform") ?? ""}" tanımlı değil`);

    if (problems.length > 0 || !saleDate || !size || !quantity || paymentMethod === undefined || channel === undefined) {
      errors.push(`Satır ${rowNo}: ${problems.join("; ")}.`);
      return;
    }

    rows.push({
      saleDate,
      saleTime: toTime(cell("Saat")),
      dishSizeId: size.id,
      quantity,
      // Tutar boşsa fiyat × adet − indirim (net tahsilat); doluysa girilen değer nettir.
      totalAmount: toNumber(cell("Tutar")) ?? Math.max(0, size.salePrice * quantity - (toNumber(cell("İndirim")) ?? 0)),
      paymentMethod,
      channel,
      platformId: channel === SalesChannel.Platform ? (platform?.id ?? null) : null,
      discountAmount: toNumber(cell("İndirim")),
    });
  });

  return { rows, errors };
}
