import { CalendarCheck, CircleCheck } from "lucide-react";
import { useState } from "react";
import { extractErrorMessage } from "../../api/apiError";
import { recurringExpenseApi } from "../../api/moduleApis";
import { AsyncState, ErrorMessage } from "../../components/ui/AsyncState";
import { Money } from "../../components/ui/Money";
import { Section } from "../../components/ui/Section";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDate, formatMoney, todayIso } from "../../lib/format";
import {
  EXPENSE_PAYMENT_METHOD_LABELS,
  PaymentMethod,
  recurringScheduleLabel,
} from "../../types/enums";
import type { RecurringPayableDto } from "../../types/recurringExpense";
import type { PaymentCardDto } from "../../types/treasury";

interface RecurringPayablesProps {
  cards: PaymentCardDto[];
  /** Değişince liste yeniden yüklenir (tanım eklendi/düzenlendi). */
  reloadKey: string;
  /** Bir ödeme yapılınca (tanım listesindeki "ödendi" durumu da güncellensin). */
  onPaid: () => void;
}

const keyOf = (p: RecurringPayableDto) =>
  `${p.recurringExpenseId}-${p.periodStartDate}`;

/**
 * "Ödenecekler": ödenmemiş dönemler satır satır; her satırda tutar, ödeme şekli (ve kartsa hangi kart) seçilip
 * "Öde" denir. Ödeme kasadan/karttan düşen otomatik bir gider olarak işlenir ve satır listeden çıkar.
 */
export function RecurringPayables({
  cards,
  reloadKey,
  onPaid,
}: RecurringPayablesProps) {
  const payables = useAsyncData(recurringExpenseApi.getPayables, reloadKey);

  return (
    <Section title="Ödenecekler" icon={CalendarCheck}>
      <AsyncState
        {...payables}
        isEmpty={(rows) => rows.length === 0}
        emptyText="Şu an ödenecek düzenli gider yok."
      >
        {(rows) => (
          <div className="payable-list">
            {rows.map((row) => (
              <PayableRow
                key={keyOf(row)}
                row={row}
                cards={cards}
                onPaid={() => {
                  payables.setData(
                    (current) =>
                      current?.filter((p) => keyOf(p) !== keyOf(row)) ??
                      current,
                  );
                  onPaid();
                }}
              />
            ))}
          </div>
        )}
      </AsyncState>
    </Section>
  );
}

interface PayableRowProps {
  row: RecurringPayableDto;
  cards: PaymentCardDto[];
  onPaid: () => void;
}

function PayableRow({ row, cards, onPaid }: PayableRowProps) {
  const [amount, setAmount] = useState(String(row.amount));
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.Cash);
  const [cardId, setCardId] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeCards = cards.filter((c) => c.isActive);
  const idPrefix = `pay-${keyOf(row)}`;

  async function pay() {
    setError(null);
    setIsPaying(true);
    try {
      await recurringExpenseApi.markPeriodPaid(row.recurringExpenseId, {
        periodStartDate: row.periodStartDate,
        periodEndDate: row.periodEndDate,
        paidAmount: Number(amount),
        paidDate: todayIso(),
        paymentMethod: method,
        paymentCardId: method === PaymentMethod.Card ? cardId || null : null,
      });
      onPaid();
    } catch (payError) {
      setError(extractErrorMessage(payError));
      setIsPaying(false);
    }
  }

  const canPay =
    Number(amount) > 0 &&
    (method !== PaymentMethod.Card || cardId !== "") &&
    !isPaying;

  return (
    <article className={`payable-row${row.isOverdue ? " overdue" : ""}`}>
      <div className="payable-row-head">
        <div>
          <strong>{row.name}</strong>
          <span>
            {recurringScheduleLabel(row.period, row.intervalCount)} ·{" "}
            {formatDate(row.periodStartDate)} – {formatDate(row.periodEndDate)}
          </span>
        </div>
        {row.isOverdue ? (
          <StatusBadge tone="danger">Gecikmiş</StatusBadge>
        ) : (
          <Money value={row.amount} />
        )}
      </div>

      <div className="payable-row-form">
        <label className="payable-field" htmlFor={`${idPrefix}-amount`}>
          <span>Tutar (₺)</span>
          <input
            id={`${idPrefix}-amount`}
            className="ui-input"
            type="number"
            min={0}
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="payable-field" htmlFor={`${idPrefix}-method`}>
          <span>Nereden</span>
          <select
            id={`${idPrefix}-method`}
            className="ui-input"
            value={method}
            onChange={(e) => setMethod(Number(e.target.value) as PaymentMethod)}
          >
            {Object.entries(EXPENSE_PAYMENT_METHOD_LABELS).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>
        {method === PaymentMethod.Card && (
          <label className="payable-field" htmlFor={`${idPrefix}-card`}>
            <span>Hangi kart</span>
            <select
              id={`${idPrefix}-card`}
              className="ui-input"
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
            >
              <option value="">Seçin…</option>
              {activeCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {formatMoney(c.availableLimit)}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          className="ui-button payable-pay"
          onClick={() => void pay()}
          disabled={!canPay}
        >
          <CircleCheck size={16} aria-hidden="true" />
          {isPaying ? "Ödeniyor…" : "Öde"}
        </button>
      </div>
      {error && <ErrorMessage message={error} />}
    </article>
  );
}
