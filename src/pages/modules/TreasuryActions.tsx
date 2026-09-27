import { ArrowLeftRight, CreditCard, SlidersHorizontal } from "lucide-react";
import { treasuryApi } from "../../api/moduleApis";
import { ModalFormButton } from "../../components/ui/ModalFormButton";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { formatMoney, todayIso } from "../../lib/format";
import { TREASURY_ACCOUNT_LABELS, TreasuryAccount, toOptions } from "../../types/enums";
import type { PaymentCardDto } from "../../types/treasury";

const REGISTER_OPTIONS = [
  { value: String(TreasuryAccount.Cash), label: TREASURY_ACCOUNT_LABELS[TreasuryAccount.Cash] },
  { value: String(TreasuryAccount.Bank), label: TREASURY_ACCOUNT_LABELS[TreasuryAccount.Bank] },
];

interface TreasuryActionsProps {
  cards: PaymentCardDto[];
  /** Sistemdeki güncel bakiyeler (bakiye ayarında farkı göstermek için). */
  balances?: { cash: number; bank: number };
  onDone: () => Promise<void>;
}

/** "Sistemde ₺X — kaydedince +₺Y düzeltme" bilgisi. */
function balanceHint(values: FormValues, balances: TreasuryActionsProps["balances"], cards: PaymentCardDto[]): string | undefined {
  const account = formValue.number(values, "account") as TreasuryAccount;
  const card = cards.find((c) => c.id === values.paymentCardId);
  const current =
    account === TreasuryAccount.CreditCard ? card?.usedAmount : account === TreasuryAccount.Bank ? balances?.bank : balances?.cash;
  if (current === undefined) {
    return undefined;
  }
  const subject = account === TreasuryAccount.CreditCard ? "Sistemdeki borç" : "Sistemdeki bakiye";
  const entered = formValue.optionalNumber(values, "balance");
  if (entered === null || Number.isNaN(entered)) {
    return `${subject}: ${formatMoney(current)}`;
  }
  const diff = entered - current;
  return diff === 0 ? `${subject}: ${formatMoney(current)} — fark yok` : `${subject}: ${formatMoney(current)} — fark ${diff > 0 ? "+" : ""}${formatMoney(diff)}`;
}

/**
 * ADMIN'in elle yaptığı üç kasa işlemi, sayfa girişinde üç düğme: nakit kasası ↔ banka hesabı transferi, kredi kartı
 * borcu ödemesi (banka hesabından ya da nakitten; limit geri açılır) ve bakiyeyi ayarla (sayım / açılış bakiyesi).
 * Banka hesabı eksiye düşemez, kart limiti aşılamaz — sunucu reddeder, hata formda görünür.
 */
export function TreasuryActions({ cards, balances, onDone }: TreasuryActionsProps) {
  const cardOptions = cards.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }));
  const isCreditCard = (values: FormValues) => String(values.account) === String(TreasuryAccount.CreditCard);

  return (
    <>
      <ModalFormButton
        label="Transfer"
        title="Nakit kasası ↔ banka hesabı transferi"
        icon={ArrowLeftRight}
        buttonClassName="ui-button secondary"
        fields={[
          { name: "from", label: "Nereden", type: "select", required: true, options: REGISTER_OPTIONS },
          { name: "to", label: "Nereye", type: "select", required: true, options: REGISTER_OPTIONS },
          { name: "amount", label: "Tutar (₺)", type: "money", required: true, min: 0 },
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
          { name: "amount", label: "Tutar (₺)", type: "money", required: true, min: 0 },
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
        label="Bakiyeyi ayarla"
        title="Bakiyeyi ayarla"
        icon={SlidersHorizontal}
        buttonClassName="ui-button secondary"
        intro={
          <p className="ui-muted">
            Kasadaki parayı saydığınızda ya da sisteme ilk başlarken gerçek tutarı girin; sistem aradaki farkı bir düzeltme hareketi
            olarak yazar. Kredi kartında kartın güncel borcunu girin.
          </p>
        }
        fields={[
          { name: "account", label: "Hesap", type: "select", required: true, options: toOptions(TREASURY_ACCOUNT_LABELS) },
          { name: "paymentCardId", label: "Kart", type: "select", required: true, options: cardOptions, visibleWhen: isCreditCard },
          {
            name: "balance",
            label: "Gerçek tutar (₺)",
            type: "money",
            required: true,
            hint: (v) => balanceHint(v, balances, cards),
          },
          { name: "date", label: "Tarih", type: "date", required: true },
          { name: "note", label: "Not" },
        ]}
        initialValues={{ account: String(TreasuryAccount.Cash), paymentCardId: cardOptions[0]?.value ?? "", balance: "", date: todayIso(), note: "" }}
        submitLabel="Bakiyeyi kaydet"
        onSubmit={async (v) => {
          await treasuryApi.setBalance({
            account: formValue.number(v, "account") as TreasuryAccount,
            paymentCardId: isCreditCard(v) ? formValue.optionalText(v, "paymentCardId") : null,
            balance: formValue.number(v, "balance"),
            date: formValue.text(v, "date"),
            note: formValue.optionalText(v, "note"),
          });
          await onDone();
        }}
      />
    </>
  );
}
