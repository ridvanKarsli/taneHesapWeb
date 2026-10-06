import type { DishDto, DishSizeDto } from "../types/dish";

/**
 * Platform dosyasındaki ürün adını sistemdeki ürün boyuyla eşleştirir. Platformlar ürünü "Tavuklu Pilav ( Duble )",
 * "Tavuklu & Tavuk Ciğerli Pilav (1,5 Porsiyon)" gibi yazar: parantez dışı kısım ürün adı, parantez içi boy ipucu.
 * Eşleşme büyük/küçük harf, boşluk ve noktalama duyarsızdır. Eşleşmeyen ürün satırı gelir olarak yine kaydedilir
 * ama reçetesi olmadığı için stoktan düşmez — bu yüzden ürün adlarını sistemde platformdaki gibi tanımlamak önemlidir.
 */
export interface ProductMatch {
  dish: DishDto;
  size: DishSizeDto;
}

/** Boy ipucu olmadığında tercih edilen boy adları ("normal porsiyon"). */
const DEFAULT_SIZE_NAMES = ["normal", "porsiyon", "1 porsiyon", "standart", "tek", "orta"];

export function normalizeProductText(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Tavuklu Pilav ( Duble )" → { base: "tavuklu pilav", hint: "duble" }. Parantezsiz ürünlerde hint null. */
export function splitProductName(text: string): { base: string; hint: string | null } {
  const parens = [...text.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);
  const base = normalizeProductText(text.replace(/\([^)]*\)/g, " "));
  const hint = parens.length > 0 ? normalizeProductText(parens[parens.length - 1]) : null;
  return { base, hint: hint || null };
}

export class ProductMatcher {
  private readonly byFullName = new Map<string, ProductMatch>();
  private readonly byDish = new Map<string, { dish: DishDto; sizes: DishSizeDto[] }>();

  constructor(dishes: DishDto[]) {
    for (const dish of dishes.filter((d) => d.isActive)) {
      const sizes = dish.sizes.filter((s) => s.isActive);
      if (sizes.length === 0) {
        continue;
      }
      this.byDish.set(normalizeProductText(dish.name), { dish, sizes });
      for (const size of sizes) {
        // "Tavuklu Pilav Duble" ve "Tavuklu Pilav (Duble)" aynı anahtara iner.
        this.byFullName.set(normalizeProductText(`${dish.name} ${size.name}`), { dish, size });
      }
    }
  }

  match(productName: string): ProductMatch | null {
    const full = normalizeProductText(productName);
    const exact = this.byFullName.get(full);
    if (exact) {
      return exact;
    }

    // Ürün sistemde dosyadaki tam adıyla tanımlıysa ("Tavuklu Pilav (1 Porsiyon)" + tek boy) doğrudan o.
    const byFull = this.byDish.get(full);
    if (byFull) {
      return { dish: byFull.dish, size: this.pickDefaultSize(byFull.sizes) };
    }

    const { base, hint } = splitProductName(productName);
    const entry = this.byDish.get(base);
    if (!entry) {
      return null;
    }

    const { dish, sizes } = entry;
    if (hint && sizes.length > 1) {
      // Birden çok boy varken parantezdeki boy sistemde olmalı; "Duble" yazıyorsa Normal'e sayılmaz (stok yanlış düşerdi).
      const bySizeHint = sizes.find((s) => {
        const name = normalizeProductText(s.name);
        return name === hint || hint.includes(name) || name.includes(hint);
      });
      return bySizeHint ? { dish, size: bySizeHint } : null;
    }
    // Tek boy: parantezdeki ne olursa olsun belirsizlik yok ("Kavurmalı Pilav (Porsiyon)" → tek boyu).
    return { dish, size: this.pickDefaultSize(sizes) };
  }

  /** Boy belirtilmemişse: tek boy varsa o, yoksa "Normal/Porsiyon" gibi varsayılan ad, o da yoksa ilk boy. */
  private pickDefaultSize(sizes: DishSizeDto[]): DishSizeDto {
    if (sizes.length === 1) {
      return sizes[0];
    }
    return sizes.find((s) => DEFAULT_SIZE_NAMES.includes(normalizeProductText(s.name))) ?? sizes[0];
  }
}
