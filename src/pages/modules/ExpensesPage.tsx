import { Hash, ListChecks, Pencil, Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { expenseApi, expenseTypeApi } from "../../api/moduleApis";
import { useAuth } from "../../auth/useAuth";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { ConfirmDialog, DeleteButton } from "../../components/ui/ConfirmDialog";
import { EntityForm, type FieldDef } from "../../components/ui/EntityForm";
import { Modal } from "../../components/ui/Modal";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Section";
import { StatGrid, StatTile } from "../../components/ui/StatTile";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDate, formatMoney, formatNumber, startOfMonthIso, todayIso } from "../../lib/format";
import { PAYMENT_METHOD_LABELS, toOptions, type PaymentMethod } from "../../types/enums";
import { UserRole } from "../../types/auth";
import type { CreateExpenseRequest, ExpenseDto, ExpenseListFilter } from "../../types/expense";

function expenseFields(typeOptions: { value: string; label: string }[]): FieldDef[] {
  return [
    { name: "expenseTypeId", label: "Gider türü", type: "select", required: true, options: typeOptions },
    { name: "amount", label: "Tutar (₺)", type: "number", required: true, min: 0 },
    { name: "quantity", label: "Miktar (opsiyonel)", type: "number", min: 0 },
    { name: "expenseDate", label: "Tarih", type: "date", required: true },
    { name: "paymentMethod", label: "Ödeme şekli", type: "select", options: toOptions(PAYMENT_METHOD_LABELS) },
    { name: "description", label: "Açıklama", type: "textarea" },
  ];
}

function toRequest(values: FormValues): CreateExpenseRequest {
  return {
    expenseTypeId: formValue.text(values, "expenseTypeId"),
    amount: formValue.number(values, "amount"),
    quantity: formValue.optionalNumber(values, "quantity"),
    expenseDate: formValue.text(values, "expenseDate"),
    paymentMethod: formValue.optionalNumber(values, "paymentMethod") as PaymentMethod | null,
    description: formValue.optionalText(values, "description"),
  };
}

function toFormValues(expense: ExpenseDto): FormValues {
  return {
    expenseTypeId: expense.expenseTypeId,
    amount: String(expense.amount),
    quantity: expense.quantity === null ? "" : String(expense.quantity),
    expenseDate: expense.expenseDate,
    paymentMethod: expense.paymentMethod === null ? "" : String(expense.paymentMethod),
    description: expense.description ?? "",
  };
}

/** Gider girişi ve listesi — ADMIN ve EMPLOYEE birlikte kullanır (bkz. proje raporu 3.1). */
export function ExpensesPage() {
  const { user } = useAuth();
  const isEmployee = user?.role === UserRole.Employee;
  const [editing, setEditing] = useState<ExpenseDto | null>(null);
  const [deleting, setDeleting] = useState<ExpenseDto | null>(null);
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
            fields={expenseFields(typeOptions)}
            initialValues={{ expenseTypeId: "", amount: "", quantity: "", expenseDate: todayIso(), paymentMethod: "0", description: "" }}
            submitLabel="Gider ekle"
            submitIcon={Plus}
            resetOnSuccess
            onSubmit={async (values) => {
              await expenseApi.create(toRequest(values));
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
              rowActions={(row) => (
                <>
                  <button type="button" className="ui-button secondary small" onClick={() => setEditing(row)}>
                    <Pencil size={14} aria-hidden="true" />
                    Düzenle
                  </button>
                  <DeleteButton onClick={() => setDeleting(row)} />
                </>
              )}
            />
          )}
        </AsyncState>
      </Section>

      {editing && (
        <Modal title={`${editing.expenseTypeName} — düzenle`} onClose={() => setEditing(null)}>
          <EntityForm
            fields={expenseFields((expenseTypes.data ?? []).map((t) => ({ value: t.id, label: `${t.name} (${t.unit})` })))}
            initialValues={toFormValues(editing)}
            submitLabel="Kaydet"
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              await expenseApi.update(editing.id, toRequest(values));
              setEditing(null);
              await expenses.reload();
            }}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Gider silinsin mi?"
          message={`${formatDate(deleting.expenseDate)} tarihli ${formatMoney(deleting.amount)} tutarındaki "${deleting.expenseTypeName}" gideri silinecek.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await expenseApi.remove(deleting.id);
            await expenses.reload();
          }}
        />
      )}
    </div>
  );
}
