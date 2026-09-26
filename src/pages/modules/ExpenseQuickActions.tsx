import { HandCoins, PackagePlus } from "lucide-react";
import { employeeApi, ingredientApi, supplierApi } from "../../api/moduleApis";
import { ModalFormButton } from "../../components/ui/ModalFormButton";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { paymentFields, paymentInitialValues, readPayment } from "../../components/ui/paymentFields";
import { useAsyncData } from "../../hooks/useAsyncData";
import { todayIso } from "../../lib/format";
import type { PaymentCardDto } from "../../types/treasury";
import { employeePaymentAmountFields, employeePaymentAmountInitialValues, readEmployeePaymentAmount } from "./employeePaymentFields";

interface ExpenseQuickActionsProps {
  cards: PaymentCardDto[];
  /** Kayıt sonrası gider listesi ve kartların yenilenmesi. */
  onDone: () => Promise<void>;
}

/**
 * Giderler ekranındaki iki sık iş, ayrı ekran aramadan: çalışana ödeme/avans (cüzdanından düşer) ve
 * tedarikçiden malzeme alışı (stok artar, birim fiyat güncellenir; alış anında ödenen kısım gider olur).
 * İkisi de arka planda ilgili modülün uç noktasını kullanır — iş kuralı tek yerde kalır.
 */
export function ExpenseQuickActions({ cards, onDone }: ExpenseQuickActionsProps) {
  const employees = useAsyncData(employeeApi.getAll);
  const suppliers = useAsyncData(supplierApi.getAll);
  const ingredients = useAsyncData(ingredientApi.getAll);

  const employeeOptions = (employees.data ?? []).filter((e) => e.isActive).map((e) => ({ value: e.id, label: e.fullName }));
  const wageOf = (values: FormValues) => (employees.data ?? []).find((e) => e.id === formValue.text(values, "employeeUserId"))?.hourlyWage ?? null;
  const supplierOptions = (suppliers.data ?? []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }));
  const ingredientOptions = (ingredients.data ?? [])
    .filter((i) => i.isActive)
    .map((i) => ({ value: i.id, label: `${i.name} (${i.unit}) — stok ${i.currentStockQuantity}` }));
  const paysNow = (values: FormValues) => formValue.optionalNumber(values, "paidAmount") !== null && formValue.number(values, "paidAmount") > 0;

  return (
    <>
      <ModalFormButton
        label="Çalışana ödeme"
        title="Çalışana ödeme / avans"
        icon={HandCoins}
        buttonClassName="ui-button secondary"
        disabled={employeeOptions.length === 0}
        intro={<p className="ui-muted">Tutar ya da saat girin (saat × saatlik ücret). Personel gideri olarak kaydedilir; seçilen kasadan/karttan ve çalışanın cüzdanından düşer. Avans da buradan girilir.</p>}
        fields={[
          { name: "employeeUserId", label: "Çalışan", type: "select", required: true, options: employeeOptions },
          ...employeePaymentAmountFields(wageOf),
          { name: "date", label: "Tarih", type: "date", required: true },
          ...paymentFields(cards),
          { name: "note", label: "Not (örn. avans, haftalık)", placeholder: "avans" },
        ]}
        initialValues={{ employeeUserId: "", ...employeePaymentAmountInitialValues, date: todayIso(), ...paymentInitialValues, note: "" }}
        submitLabel="Ödemeyi kaydet"
        onSubmit={async (values) => {
          await employeeApi.pay(formValue.text(values, "employeeUserId"), {
            ...readEmployeePaymentAmount(values),
            date: formValue.text(values, "date"),
            ...readPayment(values),
            note: formValue.optionalText(values, "note"),
          });
          await onDone();
        }}
      />
      <ModalFormButton
        label="Malzeme alışı"
        title="Tedarikçiden malzeme alışı"
        icon={PackagePlus}
        buttonClassName="ui-button secondary"
        disabled={supplierOptions.length === 0 || ingredientOptions.length === 0}
        intro={
          <p className="ui-muted">
            Alış kaydedilince malzemenin stoğu artar ve birim fiyatı güncellenir. Ödenen tutar gider olarak kasadan/karttan düşer; ödenmeyen kısım
            tedarikçi borcu olarak kalır (Mutfak ve Stok → Tedarikçiler).
          </p>
        }
        fields={[
          { name: "supplierId", label: "Tedarikçi", type: "select", required: true, options: supplierOptions },
          { name: "ingredientId", label: "Malzeme", type: "select", required: true, options: ingredientOptions },
          { name: "quantity", label: "Miktar (malzemenin biriminde)", type: "number", required: true, min: 0 },
          { name: "unitPrice", label: "Birim fiyat (₺)", type: "number", required: true, min: 0 },
          { name: "purchaseDate", label: "Tarih", type: "date", required: true },
          { name: "paidAmount", label: "Şimdi ödenen tutar (₺, boş = borç)", type: "number", min: 0 },
          ...paymentFields(cards).map((field) => ({ ...field, visibleWhen: (values: FormValues) => paysNow(values) && (!field.visibleWhen || field.visibleWhen(values)) })),
        ]}
        initialValues={{ supplierId: "", ingredientId: "", quantity: "", unitPrice: "", purchaseDate: todayIso(), paidAmount: "", ...paymentInitialValues }}
        submitLabel="Alışı kaydet"
        onSubmit={async (values) => {
          const payment = paysNow(values) ? readPayment(values) : { paymentMethod: null, paymentCardId: null };
          await supplierApi.addPurchase(formValue.text(values, "supplierId"), {
            ingredientId: formValue.text(values, "ingredientId"),
            quantity: formValue.number(values, "quantity"),
            unitPrice: formValue.number(values, "unitPrice"),
            purchaseDate: formValue.text(values, "purchaseDate"),
            paidAmount: formValue.optionalNumber(values, "paidAmount"),
            ...payment,
          });
          await Promise.all([onDone(), ingredients.reload()]);
        }}
      />
    </>
  );
}
