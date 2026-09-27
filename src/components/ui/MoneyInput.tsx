import { useLayoutEffect, useRef, useState, type ChangeEvent, type ClipboardEvent } from "react";
import {
  formatMoneyTyping,
  moneyDisplayToValue,
  moneyValueToDisplay,
  parsePastedMoney,
  positionAfterSignificant,
  significantCharsBefore,
} from "../../lib/moneyInput";

interface MoneyInputProps {
  id?: string;
  /** Makine biçiminde değer ("1250.5"); boş dize = boş kutu. */
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * Tutar kutusu: yazarken binlik ayırıcı noktalar kendiliğinden eklenir ("1.250.000"), kuruş virgülle girilir.
 * Mobilde sayısal klavye açılır (inputMode="decimal"). Dışarıya her zaman makine biçimi verilir.
 */
export function MoneyInput({ id, value, onChange, required, placeholder = "0", className = "ui-input", ...rest }: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const [display, setDisplay] = useState(() => moneyValueToDisplay(value));
  const [lastValue, setLastValue] = useState(value);

  // Değer dışarıdan değişirse (form sıfırlama, düzenleme açılışı) kutu da güncellenir.
  if (value !== lastValue) {
    setLastValue(value);
    if (value !== moneyDisplayToValue(display)) {
      setDisplay(moneyValueToDisplay(value));
    }
  }

  useLayoutEffect(() => {
    if (pendingCaret.current !== null && inputRef.current === document.activeElement) {
      inputRef.current?.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  }, [display]);

  function commit(next: string, caretSignificant: number) {
    pendingCaret.current = positionAfterSignificant(next, caretSignificant);
    setDisplay(next);
    const nextValue = moneyDisplayToValue(next);
    setLastValue(nextValue);
    onChange(nextValue);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    const caret = event.target.selectionStart ?? raw.length;
    const next = formatMoneyTyping(raw, display);
    // Sona yazılan nokta virgüle çevrildiyse imleç onun ardında kalır.
    const typedDecimalDot = raw.endsWith(".") && next.endsWith(",");
    commit(next, typedDecimalDot ? significantCharsBefore(next, next.length) : significantCharsBefore(raw, caret));
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!pasted) {
      return;
    }
    event.preventDefault();
    const next = parsePastedMoney(pasted);
    commit(next, significantCharsBefore(next, next.length));
  }

  return (
    <input
      {...rest}
      ref={inputRef}
      id={id}
      className={className}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={display}
      required={required}
      placeholder={placeholder}
      onChange={handleChange}
      onPaste={handlePaste}
    />
  );
}
