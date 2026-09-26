import type { FieldDef } from "../../components/ui/EntityForm";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { Money } from "../../components/ui/Money";

/** Çalışana ödemenin "neye göre" girileceği: tutar veya saat (saat × saatlik ücret). */
const PAY_BY_OPTIONS = [
  { value: "amount", label: "Tutar (₺)" },
  { value: "hours", label: "Saat (saat × saatlik ücret)" },
];

const paysByHours = (values: FormValues) =>
  formValue.text(values, "payBy") === "hours";

/**
 * Çalışana ödeme formlarının (Giderler → Çalışana ödeme, Çalışanlar → Cüzdan → Ödeme yap) ortak alanları.
 * `wageOf` o anda seçili çalışanın saatlik ücretini verir; saat seçildiyse alanın altında hesap canlı gösterilir.
 */
export function employeePaymentAmountFields(
  wageOf: (values: FormValues) => number | null,
): FieldDef[] {
  return [
    {
      name: "payBy",
      label: "Ödeme neye göre",
      type: "select",
      required: true,
      options: PAY_BY_OPTIONS,
    },
    {
      name: "amount",
      label: "Tutar (₺)",
      type: "number",
      required: true,
      min: 0,
      visibleWhen: (v) => !paysByHours(v),
    },
    {
      name: "hours",
      label: "Saat",
      type: "number",
      required: true,
      min: 0,
      step: "0.5",
      visibleWhen: paysByHours,
      hint: (values) => {
        const wage = wageOf(values);
        const hours = formValue.optionalNumber(values, "hours");
        if (!wage) {
          return "Bu çalışanın saatlik ücreti tanımlı değil — tutar olarak ödeyin.";
        }
        return hours ? (
          <>
            {hours} saat × <Money value={wage} /> ={" "}
            <Money value={Math.round(hours * wage * 100) / 100} />
          </>
        ) : (
          <>
            Saatlik ücret: <Money value={wage} />
          </>
        );
      },
    },
  ];
}

export const employeePaymentAmountInitialValues: FormValues = {
  payBy: "amount",
  amount: "",
  hours: "",
};

export function readEmployeePaymentAmount(values: FormValues): {
  amount: number | null;
  hours: number | null;
} {
  return paysByHours(values)
    ? { amount: null, hours: formValue.number(values, "hours") }
    : { amount: formValue.number(values, "amount"), hours: null };
}
