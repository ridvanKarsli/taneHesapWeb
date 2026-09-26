import type { DishDto } from "../types/dish";
import { PaymentMethod, SalesChannel } from "../types/enums";
import type { PlatformDto } from "../types/platform";
import { buildTemplateSheets, parseSalesSheet, type CellValue, type ParsedSales, type SheetFormat } from "./salesExcel";

/**
 * Satışlar yalnızca Excel ile girilir; üç kaynak vardır: dükkânın kasa (POS) dökümü, Yemeksepeti ve Uber.
 * Her kaynak kendi ayrıştırıcısını taşır (strateji deseni). Şu an üçü de taneHesap şablonunu okur; gerçek
 * dışa aktarım dosyaları gelince yalnızca ilgili kaynağın `parse`/`template` fonksiyonu değişir — sayfa,
 * içe aktarma akışı ve backend aynı kalır.
 */
export type SalesSourceId = "kasa" | "yemeksepeti" | "uber";

export interface SalesSourceContext {
  dishes: DishDto[];
  platforms: PlatformDto[];
}

export interface SalesSource {
  id: SalesSourceId;
  label: string;
  /** Kaynağın satırları hangi kanala yazılır. */
  channel: SalesChannel;
  /** Paket servis kaynaklarında platform, Tanımlar → Paket Servis'teki adla eşleşir (bu kelimelerden biri geçmeli). */
  platformKeywords?: string[];
  /** Dosyada ödeme sütunu boşsa kullanılacak ödeme şekli (platform ödemesi bankaya gelir → Kart). */
  defaultPayment: PaymentMethod;
  hint: string;
}

export const SALES_SOURCES: SalesSource[] = [
  {
    id: "kasa",
    label: "Kasa",
    channel: SalesChannel.InStore,
    defaultPayment: PaymentMethod.Cash,
    hint: "Dükkân içi satışlar (kasa dökümü). Ödeme sütunu Nakit/Kart.",
  },
  {
    id: "yemeksepeti",
    label: "Yemeksepeti",
    channel: SalesChannel.Platform,
    platformKeywords: ["yemeksepeti", "yemek sepeti"],
    defaultPayment: PaymentMethod.Card,
    hint: "Yemeksepeti siparişleri; komisyon otomatik gider olur.",
  },
  {
    id: "uber",
    label: "Uber",
    channel: SalesChannel.Platform,
    platformKeywords: ["uber"],
    defaultPayment: PaymentMethod.Card,
    hint: "Uber siparişleri; komisyon otomatik gider olur.",
  },
];

const normalize = (text: string) => text.trim().toLocaleLowerCase("tr-TR");

/** Paket servis kaynağının Tanımlar'daki platformu (yoksa null → önce platform eklenmeli). */
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

export function parseSourceSheet(source: SalesSource, sheet: CellValue[][], ctx: SalesSourceContext): ParsedSales {
  return parseSalesSheet(sheet, ctx.dishes, formatOf(source, ctx.platforms));
}

export function buildSourceTemplate(source: SalesSource, ctx: SalesSourceContext, date: string) {
  return buildTemplateSheets(ctx.dishes, date, source.defaultPayment);
}
