import { Hash, ListChecks, Pencil, Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { employeeApi, expenseApi, expenseTypeApi, treasuryApi } from "../../api/moduleApis";
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
import {
  EXPENSE_PAYMENT_METHOD_LABELS,
  ExpenseCategory,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  toOptions,
} from "../../types/enums";
import { UserRole } from "../../types/auth";
import type { CreateExpenseRequest, ExpenseDto, ExpenseListFilter } from "../../types/expense";
import type { ExpenseTypeDto } from "../../types/expenseType";

type Option = { value: string; label: string };

interface ExpenseFieldSources {
  types: ExpenseTypeDto[];
  cards: Option[];
  /** ADMIN için çalışan listesi; EMPLOYEE'de boş (çalışan seçimi gösterilmez). */
  employees: Option[];
}

/**
 * Kart seçimi yalnızca "Kredi kartı" ödemesinde, çalışan seçimi yalnızca Personel kategorisindeki türlerde
 * görünür (bkz. proje raporu 3.15, 3.7) — kural formda tek yerde, backend de aynı kuralı doğrular.
 */
function expenseFields({ types, cards, employees }: ExpenseFieldSources): FieldDef[] {
  const isCard = (values: FormValues) => String(values.paymentMethod) === String(PaymentMethod.Card);
  const isPersonnel = (values: FormValues) =>
    types.find((t) => t.id === values.expenseTypeId)?.category === ExpenseCategory.Personnel;

  return [
    { name: "expenseTypeId", label: "Gider türü", type: "select", required: true, options: types.map(typeOption) },
    { name: "amount", label: "Tutar (₺)", type: "number", required: true, min: 0 },
    { name: "quantity", label: "Miktar (opsiyonel)", type: "number", min: 0 },
    { name: "expenseDate", label: "Tarih", type: "date", required: true },
    { name: "paymentMethod", label: "Ödeme şekli", type: "select", options: toOptions(EXPENSE_PAYMENT_METHOD_LABELS) },
    { name: "paymentCardId", label: "Hangi kart", type: "select", required: true, options: cards, visibleWhen: isCard },
    ...(employees.length > 0
      ? [{ name: "employeeUserId", label: "Çalışan", type: "select" as const, options: employees, visibleWhen: isPersonnel }]
      : []),
    { name: "description", label: "Açıklama", type: "textarea" },
  ];
}

function typeOption(t: ExpenseTypeDto): Option {
  return { value: t.id, label: `${t.name} (${t.unit})` };
}

function toRequest(values: FormValues, types: ExpenseTypeDto[]): CreateExpenseRequest {
  const paymentMethod = formValue.optionalNumber(values, "paymentMethod") as PaymentMethod | null;
  const isPersonnel = types.find((t) => t.id === values.expenseTypeId)?.category === ExpenseCategory.Personnel;
  return {
    expenseTypeId: formValue.text(values, "expenseTypeId"),
    amount: formValue.number(values, "amount"),
    quantity: formValue.optionalNumber(values, "quantity"),
    expenseDate: formValue.text(values, "expenseDate"),
    paymentMethod,
    paymentCardId: paymentMethod === PaymentMethod.Card ? formValue.optionalText(values, "paymentCardId") : null,
    employeeUserId: isPersonnel ? formValue.optionalText(values, "employeeUserId") : null,
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
    paymentCardId: expense.paymentCardId ?? "",
    employeeUserId: expense.employeeUserId ?? "",
    description: expense.description ?? "",
  };
}

function paymentLabel(row: ExpenseDto): string {
  if (row.paymentMethod === null) return "—";
  const base = PAYMENT_METHOD_LABELS[row.paymentMethod];
  return row.paymentCardName ? `${base} · ${row.paymentCardName}` : base;
}

/** Gider girişi ve listesi — ADMIN ve EMPLOYEE birlikte kullanır (bkz. proje raporu 3.1). */
export function ExpensesPage() {
  const { user } = useAuth();
  const isEmployee = user?.role === UserRole.Employee;
  const [editing, setEditing] = useState<ExpenseDto | null>(null);
  const [deleting, setDeleting] = useState<ExpenseDto | null>(null);
  const [filter, setFilter] = useState<ExpenseListFilter>({ fromDate: startOfMonthIso(todayIso()), toDate: todayIso() });
  const expenseTypes = useAsyncData(expenseTypeApi.getAll);
  const cards = useAsyncData(treasuryApi.getAll);
  const employees = useAsyncData(() => (isEmployee ? Promise.resolve([]) : employeeApi.getAll()), String(isEmployee));
  const expenses = useAsyncData(() => expenseApi.getList(filter), JSON.stringify(filter));

  const allTypes = expenseTypes.data ?? [];
  const activeTypes = allTypes.filter((t) => t.isActive);
  const cardOptions = (cards.data ?? []).filter((c) => c.isActive).map((c) => ({ value: c.id, label: `${c.name} (kullanılabilir ${formatMoney(c.availableLimit)})` }));
  const employeeOptions = (employees.data ?? []).map((e) => ({ value: e.id, label: e.fullName }));
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
            fields={expenseFields({ types: activeTypes, cards: cardOptions, employees: employeeOptions })}
            initialValues={{ expenseTypeId: "", amount: "", quantity: "", expenseDate: todayIso(), paymentMethod: "0", paymentCardId: "", employeeUserId: "", description: "" }}
            submitLabel="Gider ekle"
            submitIcon={Plus}
            resetOnSuccess
            onSubmit={async (values) => {
              await expenseApi.create(toRequest(values, allTypes));
              await Promise.all([expenses.reload(), cards.reload()]);
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
                { header: "Ödeme", render: (row) => paymentLabel(row) },
                { header: "Açıklama", render: (row) => (row.employeeName ? `${row.employeeName} — ${row.description ?? ""}` : row.description || "—") },
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
            fields={expenseFields({ types: allTypes, cards: cardOptions, employees: employeeOptions })}
            initialValues={toFormValues(editing)}
            submitLabel="Kaydet"
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              await expenseApi.update(editing.id, toRequest(values, allTypes));
              setEditing(null);
              await Promise.all([expenses.reload(), cards.reload()]);
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
            await Promise.all([expenses.reload(), cards.reload()]);
          }}
        />
      )}
    </div>
  );
}
