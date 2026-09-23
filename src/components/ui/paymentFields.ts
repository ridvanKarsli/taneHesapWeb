import { formatMoney } from "../../lib/format";
import type { FieldDef } from "./EntityForm";
import { formValue, type FormValues } from "./formValues";
import { EXPENSE_PAYMENT_METHOD_LABELS, PaymentMethod, toOptions } from "../../types/enums";
import type { PaymentCardDto } from "../../types/treasury";

export interface PaymentSelection {
  paymentMethod: PaymentMethod;
  paymentCardId: string | null;
}

/**
 * Para çıkışı olan her formda (gider, personel ödemesi, tedarikçi ödemesi, düzenli gider ödemesi) aynı iki
 * alan: ödeme şekli + (yalnızca "Kredi kartı" seçilince) hangi kart. Tek yerde tanımlı, tek yerde okunur (DRY);
 * backend aynı kuralı doğrular.
 */
export function paymentFields(cards: PaymentCardDto[], options?: { required?: boolean }): FieldDef[] {
  return [
    {
      name: "paymentMethod",
      label: "Ödeme şekli",
      type: "select",
      required: options?.required ?? true,
      options: toOptions(EXPENSE_PAYMENT_METHOD_LABELS),
    },
    {
      name: "paymentCardId",
      label: "Hangi kart",
      type: "select",
      required: true,
      options: cards.filter((c) => c.isActive).map((c) => ({ value: c.id, label: `${c.name} — kullanılabilir ${formatMoney(c.availableLimit)}` })),
      visibleWhen: (values: FormValues) => String(values.paymentMethod) === String(PaymentMethod.Card),
    },
  ];
}

export const paymentInitialValues: FormValues = { paymentMethod: String(PaymentMethod.Cash), paymentCardId: "" };

export function readPayment(values: FormValues): PaymentSelection {
  const paymentMethod = formValue.number(values, "paymentMethod") as PaymentMethod;
  return { paymentMethod, paymentCardId: paymentMethod === PaymentMethod.Card ? formValue.optionalText(values, "paymentCardId") : null };
}

/** Ödeme şekli boş bırakılabilen formlar (gider) için. */
export function readOptionalPayment(values: FormValues): { paymentMethod: PaymentMethod | null; paymentCardId: string | null } {
  if (formValue.text(values, "paymentMethod") === "") {
    return { paymentMethod: null, paymentCardId: null };
  }
  return readPayment(values);
}
