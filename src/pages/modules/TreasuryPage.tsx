import { Banknote, CreditCard, Landmark, Percent } from "lucide-react";
import { useState } from "react";
import { treasuryApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { ConfirmDialog, DeleteButton } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { DateFilter } from "../../components/ui/DateFilter";
import { formValue } from "../../components/ui/formValues";
import { ModalFormButton } from "../../components/ui/ModalFormButton";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Section";
import { StatGrid, StatTile } from "../../components/ui/StatTile";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDate, formatMoney, startOfMonthIso, todayIso } from "../../lib/format";
import { TREASURY_ACCOUNT_LABELS, TREASURY_KIND_LABELS, TreasuryAccount, TreasuryTransactionKind, toOptions } from "../../types/enums";
import type { TreasuryTransactionDto, TreasuryTransactionFilter } from "../../types/treasury";
import { TreasuryActions } from "./TreasuryActions";

const MANUAL_KINDS: TreasuryTransactionKind[] = [
  TreasuryTransactionKind.Transfer,
  TreasuryTransactionKind.CardPayment,
  TreasuryTransactionKind.ManualAdjustment,
];

function accountLabel(row: TreasuryTransactionDto): string {
  return row.account === TreasuryAccount.CreditCard ? `Kart · ${row.paymentCardName ?? "—"}` : TREASURY_ACCOUNT_LABELS[row.account];
}

/**
 * Kasa: nakit kasası ve kart kasası (banka) bakiyeleri, kredi kartları ve limitleri, transfer/kart ödemesi,
 * hareket defteri. Satış gelirleri ve gider ödemeleri buraya otomatik yazılır (bkz. proje raporu 3.15).
 */
export function TreasuryPage() {
  const summary = useAsyncData(treasuryApi.getSummary);
  const [filter, setFilter] = useState<TreasuryTransactionFilter>({ fromDate: startOfMonthIso(todayIso()), toDate: todayIso() });
  const transactions = useAsyncData(() => treasuryApi.getTransactions(filter), JSON.stringify(filter));
  const [deleting, setDeleting] = useState<TreasuryTransactionDto | null>(null);

  const cards = summary.data?.cards ?? [];
  const totalCardDebt = cards.reduce((sum, c) => sum + c.usedAmount, 0);
  const money = (value: number | undefined) => (value === undefined ? "…" : formatMoney(value));

  async function refreshAll() {
    await Promise.all([summary.reload(), transactions.reload()]);
  }

  return (
    <div>
      <PageHeader
        actions={
          <>
            <ModalFormButton
              label={`Kart komisyonu %${summary.data?.cardFeePercentage ?? "…"}`}
              title="Kart komisyon oranı"
              icon={Percent}
              buttonClassName="ui-button ghost"
              intro={<p className="ui-muted">Dükkan içi kart (POS) satışlarında bankanın kestiği yüzde. Her günün kesintisi otomatik bir "Kart Komisyonu" gideri olarak işlenir.</p>}
              fields={[{ name: "cardFeePercentage", label: "Komisyon (%)", type: "number", required: true, min: 0, step: "0.01" }]}
              initialValues={{ cardFeePercentage: String(summary.data?.cardFeePercentage ?? 3) }}
              onSubmit={async (values) => {
                await treasuryApi.updateSettings(formValue.number(values, "cardFeePercentage"));
                await summary.reload();
              }}
            />
            <TreasuryActions cards={cards} onDone={refreshAll} />
          </>
        }
      />

      <StatGrid>
        <StatTile
          icon={Banknote}
          iconTone="green"
          label="Nakit kasası"
          value={money(summary.data?.cashBalance)}
          tone={summary.data && summary.data.cashBalance < 0 ? "negative" : undefined}
        />
        <StatTile
          icon={Landmark}
          iconTone="teal"
          label="Kart kasası (banka)"
          value={money(summary.data?.bankBalance)}
          tone={summary.data && summary.data.bankBalance < 0 ? "negative" : undefined}
        />
        <StatTile icon={CreditCard} iconTone="rose" label="Toplam kart borcu" value={summary.data ? formatMoney(totalCardDebt) : "…"} />
        {cards.map((card) => (
          <StatTile
            key={card.id}
            icon={CreditCard}
            iconTone="slate"
            label={`${card.name} — kullanılabilir`}
            value={formatMoney(card.availableLimit)}
            tone={card.availableLimit < 0 ? "negative" : undefined}
          />
        ))}
      </StatGrid>

      <Section
        title="Kasa hareketleri"
        actions={
          <>
            <DateFilter id="treasury-from" label="Başlangıç" value={filter.fromDate ?? ""} onChange={(fromDate) => setFilter((f) => ({ ...f, fromDate }))} />
            <DateFilter id="treasury-to" label="Bitiş" value={filter.toDate ?? ""} onChange={(toDate) => setFilter((f) => ({ ...f, toDate }))} />
            <div className="ui-filter">
              <label htmlFor="treasury-account">Hesap</label>
              <select
                id="treasury-account"
                value={filter.account === undefined ? "" : String(filter.account)}
                onChange={(e) => setFilter((f) => ({ ...f, account: e.target.value === "" ? undefined : (Number(e.target.value) as TreasuryAccount) }))}
              >
                <option value="">Tümü</option>
                {toOptions(TREASURY_ACCOUNT_LABELS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        }
      >
        <AsyncState {...transactions} isEmpty={(rows) => rows.length === 0} emptyText="Bu aralıkta kasa hareketi yok.">
          {(rows) => (
            <DataTable
              rows={rows}
              rowKey={(row) => row.id}
              columns={[
                { header: "Tarih", render: (row) => formatDate(row.transactionDate) },
                { header: "Hesap", render: accountLabel },
                { header: "Tür", render: (row) => TREASURY_KIND_LABELS[row.kind] },
                {
                  header: "Tutar",
                  align: "right",
                  render: (row) => <span className={row.amount < 0 ? "ui-text-negative" : "ui-text-positive"}>{formatMoney(row.amount)}</span>,
                },
                { header: "Açıklama", render: (row) => row.description || "—" },
              ]}
              rowActions={(row) => (MANUAL_KINDS.includes(row.kind) ? <DeleteButton onClick={() => setDeleting(row)} /> : null)}
            />
          )}
        </AsyncState>
      </Section>

      {deleting && (
        <ConfirmDialog
          title="Kasa hareketi silinsin mi?"
          message={`${formatDate(deleting.transactionDate)} tarihli "${TREASURY_KIND_LABELS[deleting.kind]}" hareketi (${formatMoney(deleting.amount)}) silinecek. Transfer ve kart ödemesinde karşı kayıt da birlikte silinir.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await treasuryApi.removeTransaction(deleting.id);
            await refreshAll();
          }}
        />
      )}
    </div>
  );
}
