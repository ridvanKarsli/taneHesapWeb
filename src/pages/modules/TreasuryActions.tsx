import { ArrowLeftRight, CreditCard, SlidersHorizontal } from "lucide-react";
import { treasuryApi } from "../../api/moduleApis";
import { ModalFormButton } from "../../components/ui/ModalFormButton";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { todayIso } from "../../lib/format";
import { TREASURY_ACCOUNT_LABELS, TreasuryAccount, toOptions } from "../../types/enums";
import type { PaymentCardDto } from "../../types/treasury";

const REGISTER_OPTIONS = [
  { value: String(TreasuryAccount.Cash), label: TREASURY_ACCOUNT_LABELS[TreasuryAccount.Cash] },
  { value: String(TreasuryAccount.Bank), label: TREASURY_ACCOUNT_LABELS[TreasuryAccount.Bank] },
];

interface TreasuryActionsProps {
  cards: PaymentCardDto[];
  onDone: () => Promise<void>;
}

/**
 * ADMIN'in elle yaptığı üç kasa işlemi, sayfa girişinde üç düğme: nakit ↔ kart kasası transferi, kredi kartı
 * borcu ödemesi (kart kasasından — kart gelirinden — ya da nakitten; limit geri açılır), açılış bakiyesi/düzeltme.
 */
export function TreasuryActions({ cards, onDone }: TreasuryActionsProps) {
  const cardOptions = cards.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }));
  const isCreditCard = (values: FormValues) => String(values.account) === String(TreasuryAccount.CreditCard);

  return (
    <>
      <ModalFormButton
        label="Transfer"
        title="Nakit ↔ kart kasası transferi"
        icon={ArrowLeftRight}
        buttonClassName="ui-button secondary"
        fields={[
          { name: "from", label: "Nereden", type: "select", required: true, options: REGISTER_OPTIONS },
          { name: "to", label: "Nereye", type: "select", required: true, options: REGISTER_OPTIONS },
          { name: "amount", label: "Tutar (₺)", type: "number", required: true, min: 0 },
          { name: "date", label: "Tarih", type: "date", required: true },
          { name: "note", label: "Not" },
        ]}
        initialValues={{ from: String(TreasuryAccount.Cash), to: String(TreasuryAccount.Bank), amount: "", date: todayIso(), note: "" }}
        submitLabel="Transfer et"
        onSubmit={async (v) => {
          await treasuryApi.transfer({
            from: formValue.number(v, "from") as TreasuryAccount,
            to: formValue.number(v, "to") as TreasuryAccount,
            amount: formValue.number(v, "amount"),
            date: formValue.text(v, "date"),
            note: formValue.optionalText(v, "note"),
          });
          await onDone();
        }}
      />
      <ModalFormButton
        label="Kart borcu öde"
        title="Kredi kartı borcu ödemesi"
        icon={CreditCard}
        buttonClassName="ui-button secondary"
        disabled={cardOptions.length === 0}
        intro={<p className="ui-muted">Ödenen tutar seçilen kasadan çıkar, kartın kullanılabilir limiti aynı tutarda geri açılır.</p>}
        fields={[
          { name: "paymentCardId", label: "Kart", type: "select", required: true, options: cardOptions },
          { name: "amount", label: "Tutar (₺)", type: "number", required: true, min: 0 },
          { name: "source", label: "Nereden ödendi", type: "select", required: true, options: REGISTER_OPTIONS },
          { name: "date", label: "Tarih", type: "date", required: true },
          { name: "note", label: "Not" },
        ]}
        initialValues={{ paymentCardId: cardOptions[0]?.value ?? "", amount: "", source: String(TreasuryAccount.Bank), date: todayIso(), note: "" }}
        submitLabel="Ödemeyi kaydet"
        onSubmit={async (v) => {
          await treasuryApi.payCard({
            paymentCardId: formValue.text(v, "paymentCardId"),
            amount: formValue.number(v, "amount"),
            source: formValue.number(v, "source") as TreasuryAccount,
            date: formValue.text(v, "date"),
            note: formValue.optionalText(v, "note"),
          });
          await onDone();
        }}
      />
      <ModalFormButton
        label="Düzeltme"
        title="Açılış bakiyesi / düzeltme"
        icon={SlidersHorizontal}
        buttonClassName="ui-button secondary"
        intro={
          <p className="ui-muted">
            Sisteme yeni başlarken kasadaki parayı ve kartlardaki mevcut borcu (kart için eksi tutar) buradan girin. Çıkış için tutarı eksi yazın.
          </p>
        }
        fields={[
          { name: "account", label: "Hesap", type: "select", required: true, options: toOptions(TREASURY_ACCOUNT_LABELS) },
          { name: "paymentCardId", label: "Kart", type: "select", required: true, options: cardOptions, visibleWhen: isCreditCard },
          { name: "amount", label: "Tutar (₺)", type: "number", required: true },
          { name: "date", label: "Tarih", type: "date", required: true },
          { name: "note", label: "Not" },
        ]}
        initialValues={{ account: String(TreasuryAccount.Cash), paymentCardId: "", amount: "", date: todayIso(), note: "" }}
        submitLabel="Düzeltmeyi kaydet"
        onSubmit={async (v) => {
          await treasuryApi.adjust({
            account: formValue.number(v, "account") as TreasuryAccount,
            paymentCardId: isCreditCard(v) ? formValue.optionalText(v, "paymentCardId") : null,
            amount: formValue.number(v, "amount"),
            date: formValue.text(v, "date"),
            note: formValue.optionalText(v, "note"),
          });
          await onDone();
        }}
      />
    </>
  );
}
