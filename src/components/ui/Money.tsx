import { formatMoney } from "../../lib/format";

/** "₺1.234,56" → ["₺1.234", ",56"]; para görünümünde olmayan metin olduğu gibi döner. */
function splitMoney(text: string): [string, string | null] {
  const at = text.lastIndexOf(",");
  return /^-?₺/.test(text) && at > 0
    ? [text.slice(0, at), text.slice(at)]
    : [text, null];
}

/** Biçimlendirilmiş bir para metnini kuruşu küçük yazarak basar (StatTile gibi metin alan yerler için). */
export function MoneyText({ text }: { text: string }) {
  const [main, cents] = splitMoney(text);
  return (
    <span className="money">
      {main}
      {cents && <small className="money-cents">{cents}</small>}
    </span>
  );
}

/** Sayıdan para: kuruş küçük — tablolar ve özetler aynı görünümü kullanır. */
export function Money({ value }: { value: number }) {
  return <MoneyText text={formatMoney(value)} />;
}
