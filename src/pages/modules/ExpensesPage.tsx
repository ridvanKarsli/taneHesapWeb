import { Hash, ListChecks, Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { expenseApi, expenseTypeApi } from "../../api/moduleApis";
import { useAuth } from "../../auth/useAuth";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { EntityForm } from "../../components/ui/EntityForm";
import { formValue } from "../../components/ui/formValues";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Section";
import { StatGrid, StatTile } from "../../components/ui/StatTile";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDate, formatMoney, formatNumber, startOfMonthIso, todayIso } from "../../lib/format";
import { PAYMENT_METHOD_LABELS, toOptions, type PaymentMethod } from "../../types/enums";
import { UserRole } from "../../types/auth";
import type { ExpenseListFilter } from "../../types/expense";

/** Gider girişi ve listesi — ADMIN ve EMPLOYEE birlikte kullanır (bkz. proje raporu 3.1). */
export function ExpensesPage() {
  const { user } = useAuth();
  const isEmployee = user?.role === UserRole.Employee;
  const [filter, setFilter] = useState<ExpenseListFilter>({ fromDate: startOfMonthIso(todayIso()), toDate: todayIso() });
  const expenseTypes = useAsyncData(expenseTypeApi.getAll);
  const expenses = useAsyncData(() => expenseApi.getList(filter), JSON.stringify(filter));

  const activeTypes = (expenseTypes.data ?? []).filter((t) => t.isActive);
  const typeOptions = activeTypes.map((t) => ({ value: t.id, label: `${t.name} (${t.unit})` }));
  const total = (expenses.data ?? []).reduce((sum, e) => sum + e.amount, 0);

  function updateFilter(patch: Partial<ExpenseListFilter>) {
    setFilter((current) => ({ ...current, ...patch }));
  }

  return (
    <div>
      <PageHeader
        title="Giderler"
        description={
          isEmployee
            ? "Gider türünü seçip tutarı girin. Listede sadece sizin girdiğiniz giderler görünür."
            : "Gider türünü seçip tutarı girin; her kayıt denetim kaydına işlenir."
        }
      />

      <Section title="Yeni gider" icon={Plus}>
        {expenseTypes.data && activeTypes.length === 0 ? (
          <p className="ui-muted">Önce işletme sahibinin "Gider Türleri" sayfasından en az bir gider türü tanımlaması gerekiyor.</p>
        ) : (
          <EntityForm
            layout="inline"
            fields={[
              { name: "expenseTypeId", label: "Gider türü", type: "select", required: true, options: typeOptions },
              { name: "amount", label: "Tutar (₺)", type: "number", required: true, min: 0 },
              { name: "quantity", label: "Miktar (opsiyonel)", type: "number", min: 0 },
              { name: "expenseDate", label: "Tarih", type: "date", required: true },
              { name: "paymentMethod", label: "Ödeme şekli", type: "select", options: toOptions(PAYMENT_METHOD_LABELS) },
              { name: "description", label: "Açıklama", type: "textarea" },
            ]}
            initialValues={{ expenseTypeId: "", amount: "", quantity: "", expenseDate: todayIso(), paymentMethod: "0", description: "" }}
            submitLabel="Gider ekle"
            submitIcon={Plus}
            resetOnSuccess
            onSubmit={async (values) => {
              await expenseApi.create({
                expenseTypeId: formValue.text(values, "expenseTypeId"),
                amount: formValue.number(values, "amount"),
                quantity: formValue.optionalNumber(values, "quantity"),
                expenseDate: formValue.text(values, "expenseDate"),
                paymentMethod: formValue.optionalNumber(values, "paymentMethod") as PaymentMethod | null,
                description: formValue.optionalText(values, "description"),
              });
              await expenses.reload();
            }}
          />
        )}
      </Section>

      <Section
        title={isEmployee ? "Girdiğim giderler" : "Gider listesi"}
        icon={ListChecks}
        actions={
          <div className="ui-toolbar">
            <div className="ui-filter">
              <label htmlFor="expense-from">Başlangıç</label>
              <input id="expense-from" type="date" value={filter.fromDate ?? ""} onChange={(e) => updateFilter({ fromDate: e.target.value })} />
            </div>
            <div className="ui-filter">
              <label htmlFor="expense-to">Bitiş</label>
              <input id="expense-to" type="date" value={filter.toDate ?? ""} onChange={(e) => updateFilter({ toDate: e.target.value })} />
            </div>
            <div className="ui-filter">
              <label htmlFor="expense-type">Tür</label>
              <select id="expense-type" value={filter.expenseTypeId ?? ""} onChange={(e) => updateFilter({ expenseTypeId: e.target.value || undefined })}>
                <option value="">Tümü</option>
                {(expenseTypes.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
      >
        <StatGrid>
          <StatTile icon={Wallet} iconTone="rose" label="Seçili aralıkta toplam" value={formatMoney(total)} />
          <StatTile icon={Hash} iconTone="slate" label="Kayıt sayısı" value={String(expenses.data?.length ?? 0)} />
        </StatGrid>
        <AsyncState {...expenses} isEmpty={(rows) => rows.length === 0} emptyText="Bu aralıkta gider yok.">
          {(rows) => (
            <DataTable
              rows={rows}
              rowKey={(row) => row.id}
              columns={[
                { header: "Tarih", render: (row) => formatDate(row.expenseDate) },
                { header: "Tür", render: (row) => row.expenseTypeName },
                { header: "Miktar", align: "right", render: (row) => (row.quantity === null ? "—" : formatNumber(row.quantity)) },
                { header: "Tutar", align: "right", render: (row) => formatMoney(row.amount) },
                { header: "Ödeme", render: (row) => (row.paymentMethod === null ? "—" : PAYMENT_METHOD_LABELS[row.paymentMethod]) },
                { header: "Açıklama", render: (row) => row.description || "—" },
              ]}
            />
          )}
        </AsyncState>
      </Section>
    </div>
  );
}
