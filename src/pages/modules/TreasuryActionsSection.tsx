import { ArrowLeftRight, CreditCard, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { treasuryApi } from "../../api/moduleApis";
import { EntityForm, type FieldDef } from "../../components/ui/EntityForm";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { Section } from "../../components/ui/Section";
import { todayIso } from "../../lib/format";
import { TREASURY_ACCOUNT_LABELS, TreasuryAccount, toOptions } from "../../types/enums";
import type { PaymentCardDto } from "../../types/treasury";

type ActionKind = "transfer" | "card-payment" | "adjustment";

const ACTIONS: { kind: ActionKind; label: string }[] = [
  { kind: "transfer", label: "Nakit ↔ kart kasası transferi" },
  { kind: "card-payment", label: "Kart borcu ödemesi" },
  { kind: "adjustment", label: "Açılış bakiyesi / düzeltme" },
];

const REGISTER_OPTIONS = [
  { value: String(TreasuryAccount.Cash), label: TREASURY_ACCOUNT_LABELS[TreasuryAccount.Cash] },
  { value: String(TreasuryAccount.Bank), label: TREASURY_ACCOUNT_LABELS[TreasuryAccount.Bank] },
];

interface TreasuryActionsSectionProps {
  cards: PaymentCardDto[];
  onDone: () => Promise<void>;
}

/**
 * ADMIN'in elle yaptığı kasa işlemleri: nakit ↔ kart kasası transferi, kredi kartı borcu ödemesi (kart
 * kasasından — kart geliri — ya da nakitten; limit geri açılır), açılış bakiyesi/düzeltme. bkz. proje raporu 3.15.
 */
export function TreasuryActionsSection({ cards, onDone }: TreasuryActionsSectionProps) {
  const [kind, setKind] = useState<ActionKind>("transfer");
  const cardOptions = cards.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }));
  const isCreditCard = (values: FormValues) => String(values.account) === String(TreasuryAccount.CreditCard);

  const forms: Record<ActionKind, { fields: FieldDef[]; initial: FormValues; submit: string; run: (v: FormValues) => Promise<unknown> }> = {
    transfer: {
      fields: [
        { name: "from", label: "Nereden", type: "select", required: true, options: REGISTER_OPTIONS },
        { name: "to", label: "Nereye", type: "select", required: true, options: REGISTER_OPTIONS },
        { name: "amount", label: "Tutar (₺)", type: "number", required: true, min: 0 },
        { name: "date", label: "Tarih", type: "date", required: true },
        { name: "note", label: "Not" },
      ],
      initial: { from: String(TreasuryAccount.Cash), to: String(TreasuryAccount.Bank), amount: "", date: todayIso(), note: "" },
      submit: "Transfer et",
      run: (v) =>
        treasuryApi.transfer({
          from: formValue.number(v, "from") as TreasuryAccount,
          to: formValue.number(v, "to") as TreasuryAccount,
          amount: formValue.number(v, "amount"),
          date: formValue.text(v, "date"),
          note: formValue.optionalText(v, "note"),
        }),
    },
    "card-payment": {
      fields: [
        { name: "paymentCardId", label: "Kart", type: "select", required: true, options: cardOptions },
        { name: "amount", label: "Tutar (₺)", type: "number", required: true, min: 0 },
        { name: "source", label: "Nereden ödendi", type: "select", required: true, options: REGISTER_OPTIONS },
        { name: "date", label: "Tarih", type: "date", required: true },
        { name: "note", label: "Not" },
      ],
      initial: { paymentCardId: "", amount: "", source: String(TreasuryAccount.Bank), date: todayIso(), note: "" },
      submit: "Kart borcunu öde",
      run: (v) =>
        treasuryApi.payCard({
          paymentCardId: formValue.text(v, "paymentCardId"),
          amount: formValue.number(v, "amount"),
          source: formValue.number(v, "source") as TreasuryAccount,
          date: formValue.text(v, "date"),
          note: formValue.optionalText(v, "note"),
        }),
    },
    adjustment: {
      fields: [
        { name: "account", label: "Hesap", type: "select", required: true, options: toOptions(TREASURY_ACCOUNT_LABELS) },
        { name: "paymentCardId", label: "Kart", type: "select", required: true, options: cardOptions, visibleWhen: isCreditCard },
        { name: "amount", label: "Tutar (₺, çıkış için eksi)", type: "number", required: true },
        { name: "date", label: "Tarih", type: "date", required: true },
        { name: "note", label: "Not" },
      ],
      initial: { account: String(TreasuryAccount.Cash), paymentCardId: "", amount: "", date: todayIso(), note: "" },
      submit: "Düzeltmeyi kaydet",
      run: (v) =>
        treasuryApi.adjust({
          account: formValue.number(v, "account") as TreasuryAccount,
          paymentCardId: isCreditCard(v) ? formValue.optionalText(v, "paymentCardId") : null,
          amount: formValue.number(v, "amount"),
          date: formValue.text(v, "date"),
          note: formValue.optionalText(v, "note"),
        }),
    },
  };

  const form = forms[kind];
  const icon = kind === "transfer" ? ArrowLeftRight : kind === "card-payment" ? CreditCard : SlidersHorizontal;

  return (
    <Section
      title="Kasa işlemi"
      icon={icon}
      actions={
        <div className="ui-chip-group" role="group" aria-label="İşlem türü">
          {ACTIONS.map((action) => (
            <button
              key={action.kind}
              type="button"
              className={`ui-button small ${action.kind === kind ? "" : "ghost"}`}
              onClick={() => setKind(action.kind)}
            >
              {action.label}
            </button>
          ))}
        </div>
      }
    >
      {kind !== "transfer" && cardOptions.length === 0 && kind === "card-payment" ? (
        <p className="ui-muted">Kart ödemesi için önce aşağıdan bir kart tanımlayın.</p>
      ) : (
        <EntityForm
          key={kind}
          layout="inline"
          fields={form.fields}
          initialValues={form.initial}
          submitLabel={form.submit}
          resetOnSuccess
          onSubmit={async (values) => {
            await form.run(values);
            await onDone();
          }}
        />
      )}
      {kind === "adjustment" && (
        <p className="ui-muted">
          Sisteme yeni başlarken kasadaki parayı ve kartlardaki mevcut borcu (kart için eksi tutar) buradan girin.
        </p>
      )}
    </Section>
  );
}
