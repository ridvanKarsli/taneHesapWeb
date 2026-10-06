import type { DishDto } from "../types/dish";
import { PaymentMethod, SalesChannel } from "../types/enums";
import type { PlatformDto } from "../types/platform";
import { looksLikeTrendyolSheet, looksLikeYemeksepetiSheet, parseTrendyolSheet, parseYemeksepetiSheet } from "./platformSheets";
import { ProductMatcher } from "./productMatcher";
import { parseSalesSheet, type CellValue, type ParsedSales, type SheetFormat } from "./salesExcel";

/**
 * Satışlar yalnızca Excel ile girilir; üç kaynak vardır: dükkânın kasa dökümü, Yemeksepeti ve Trendyol Go
 * (Uber Eats kuryeli). Her kaynak kendi ayrıştırıcısını taşır (strateji deseni): platform dosyaları panelden
 * indirildiği gibi yüklenir (şablon yok); kasa dökümü gelene kadar Kasa için taneHesap biçimi okunur.
 */
export type SalesSourceId = "kasa" | "yemeksepeti" | "trendyolgo";

type SheetParser = (sheet: CellValue[][], ctx: SalesSourceContext, format: SheetFormat) => ParsedSales;

export interface SalesSourceContext {
  dishes: DishDto[];
  platforms: PlatformDto[];
}

export interface SalesSource {
  id: SalesSourceId;
  label: string;
  /** Kaynağın satırları hangi kanala yazılır. */
  channel: SalesChannel;
  /** Paket servis kaynaklarında platform, Gün Sonu → Paket Servis'teki (süper admin) adla eşleşir (bu kelimelerden biri geçmeli). */
  platformKeywords?: string[];
  /** Dosyada ödeme sütunu boşsa kullanılacak ödeme şekli (platform ödemesi bankaya gelir → Kart). */
  defaultPayment: PaymentMethod;
  hint: string;
  /** Dosya bu kaynağın biçimine benziyor mu (yanlış karta yüklemeyi yakalamak için). */
  looksLike: (sheet: CellValue[][]) => boolean;
  parse: SheetParser;
}

export const SALES_SOURCES: SalesSource[] = [
  {
    id: "kasa",
    label: "Kasa",
    channel: SalesChannel.InStore,
    defaultPayment: PaymentMethod.Cash,
    hint: "Dükkân içi satışlar (kasa dökümü). Ödeme sütunu Nakit/Kart.",
    looksLike: (sheet) => !looksLikeTrendyolSheet(sheet) && !looksLikeYemeksepetiSheet(sheet),
    parse: (sheet, ctx, format) => parseSalesSheet(sheet, ctx.dishes, format),
  },
  {
    id: "yemeksepeti",
    label: "Yemeksepeti",
    channel: SalesChannel.Platform,
    platformKeywords: ["yemeksepeti", "yemek sepeti"],
    defaultPayment: PaymentMethod.Card,
    hint: "Yemeksepeti panelindeki sipariş raporu (olduğu gibi). Komisyon otomatik gider olur.",
    looksLike: looksLikeYemeksepetiSheet,
    parse: (sheet, ctx, format) => parseYemeksepetiSheet(sheet, new ProductMatcher(ctx.dishes), format),
  },
  {
    id: "trendyolgo",
    label: "Trendyol Go",
    channel: SalesChannel.Platform,
    platformKeywords: ["trendyol", "uber"],
    defaultPayment: PaymentMethod.Card,
    hint: "Trendyol Go (Uber Eats kuryeli) sipariş dökümü (olduğu gibi). Komisyon otomatik gider olur.",
    looksLike: looksLikeTrendyolSheet,
    parse: (sheet, ctx, format) => parseTrendyolSheet(sheet, new ProductMatcher(ctx.dishes), format),
  },
];

const normalize = (text: string) => text.trim().toLocaleLowerCase("tr-TR");

/** Paket servis kaynağının tanımlı platformu (yoksa null → önce platform eklenmeli). */
export function platformOf(source: SalesSource, platforms: PlatformDto[]): PlatformDto | null {
  if (!source.platformKeywords) {
    return null;
  }
  return platforms.find((p) => p.isActive && source.platformKeywords!.some((k) => normalize(p.name).includes(k))) ?? null;
}

function formatOf(source: SalesSource, platforms: PlatformDto[]): SheetFormat {
  const platform = platformOf(source, platforms);
  return { channel: source.channel, platformId: platform?.id ?? null, defaultPayment: source.defaultPayment };
}

/** Dosyayı kaynağın ayrıştırıcısıyla okur; başka bir kaynağın dosyası yüklendiyse adıyla uyarır. */
export function parseSourceSheet(source: SalesSource, sheet: CellValue[][], ctx: SalesSourceContext): ParsedSales {
  const other = SALES_SOURCES.find((s) => s.id !== source.id && s.id !== "kasa" && s.looksLike(sheet));
  if (other && !source.looksLike(sheet)) {
    return { rows: [], errors: [`Bu dosya ${other.label} dökümüne benziyor. Lütfen ${other.label} kartından yükleyin.`] };
  }
  const format = formatOf(source, ctx.platforms);
  if (format.channel === SalesChannel.Platform && !format.platformId) {
    return { rows: [], errors: ["Bu paket servis platformu pasif ya da silinmiş; Paket Servis'ten (süper admin) yeniden etkinleştirilmeli."] };
  }
  return source.parse(sheet, ctx, format);
}
