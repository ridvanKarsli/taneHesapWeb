/** Kabuk (kenar çubuğu, alt çubuk, Daha fazla sayfası) arasında paylaşılan sabitler ve yardımcılar. */

/** Alt çubukta en fazla bu kadar grup sekmesi; kalanlar "Daha fazla" sayfasından açılır. */
export const MAX_BOTTOM_TABS = 4;
export const MORE_PATH = "/daha-fazla";

/** "Rıdvan Karslı" → "RK" (avatar rozeti). */
export function initialsOf(fullName: string): string {
  return fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
