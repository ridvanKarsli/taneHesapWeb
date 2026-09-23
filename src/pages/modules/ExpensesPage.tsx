import { Bot, Hash, Pencil, Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { employeeApi, expenseApi, expenseTypeApi } from "../../api/moduleApis";
import { useAuth } from "../../auth/useAuth";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { ConfirmDialog, DeleteButton } from "../../components/ui/ConfirmDialog";
import { EntityForm, type FieldDef } from "../../components/ui/EntityForm";
import { Modal } from "../../components/ui/Modal";
import { ModalFormButton } from "../../components/ui/ModalFormButton";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { PageHeader } from "../../components/ui/PageHeader";
import { paymentFields, paymentInitialValues, readOptionalPayment } from "../../components/ui/paymentFields";
import { Section } from "../../components/ui/Section";
import { StatGrid, StatTile } from "../../components/ui/StatTile";
import { useAsyncData } from "../../hooks/useAsyncData";
import { usePaymentCards } from "../../hooks/usePaymentCards";
import { formatDate, formatMoney, formatNumber, startOfMonthIso, todayIso } from "../../lib/format";
import { ExpenseCategory, PAYMENT_METHOD_LABELS } from "../../types/enums";
import { UserRole } from "../../types/auth";
import type { CreateExpenseRequest, ExpenseDto, ExpenseListFilter } from "../../types/expense";
import type { ExpenseTypeDto } from "../../types/expenseType";
import type { PaymentCardDto } from "../../types/treasury";

type Option = { value: string; label: string };

interface ExpenseFieldSources {
  types: ExpenseTypeDto[];
  cards: PaymentCardDto[];
  /** ADMIN için çalışan listesi; EMPLOYEE'de boş (çalışan seçimi gösterilmez). */
  employees: Option[];
}

/**
 * Ödeme şekli/kart alanları ortak `paymentFields`'tan; çalışan seçimi yalnızca Personel kategorisindeki
 * türlerde görünür (bkz. proje raporu 3.15, 3.7) — kural formda tek yerde, backend de aynı kuralı doğrular.
 */
function expenseFields({ types, cards, employees }: ExpenseFieldSources): FieldDef[] {
  const isPersonnel = (values: FormValues) =>
    types.find((t) => t.id === values.expenseTypeId)?.category === ExpenseCategory.Personnel;

  return [
    { name: "expenseTypeId", label: "Gider türü", type: "select", required: true, options: types.map(typeOption) },
    { name: "amount", label: "Tutar (₺)", type: "number", required: true, min: 0 },
    { name: "quantity", label: "Miktar (opsiyonel)", type: "number", min: 0 },
    { name: "expenseDate", label: "Tarih", type: "date", required: true },
    ...paymentFields(cards, { required: false }),
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
  const isPersonnel = types.find((t) => t.id === values.expenseTypeId)?.category === ExpenseCategory.Personnel;
  return {
    expenseTypeId: formValue.text(values, "expenseTypeId"),
    amount: formValue.number(values, "amount"),
    quantity: formValue.optionalNumber(values, "quantity"),
    expenseDate: formValue.text(values, "expenseDate"),
    ...readOptionalPayment(values),
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
  const { cards, reload: reloadCards } = usePaymentCards();
  const employees = useAsyncData(() => (isEmployee ? Promise.resolve([]) : employeeApi.getAll()), String(isEmployee));
  const expenses = useAsyncData(() => expenseApi.getList(filter), JSON.stringify(filter));

  const allTypes = expenseTypes.data ?? [];
  const activeTypes = allTypes.filter((t) => t.isActive);
  const employeeOptions = (employees.data ?? []).map((e) => ({ value: e.id, label: e.fullName }));
  const total = (expenses.data ?? []).reduce((sum, e) => sum + e.amount, 0);

  async function refresh() {
    await Promise.all([expenses.reload(), reloadCards()]);
  }

  function updateFilter(patch: Partial<ExpenseListFilter>) {
    setFilter((current) => ({ ...current, ...patch }));
  }

  return (
    <div>
      <PageHeader
        description={
          isEmployee
            ? "Gider türünü seçip tutarı girin. Listede sadece sizin girdiğiniz giderler görünür."
            : "Elle girilen giderler ve sistemin ürettiği otomatik giderler (komisyon, düzenli gider, tedarikçi ve personel ödemeleri) burada toplanır."
        }
        actions={
          <ModalFormButton
            label="Yeni gider"
            icon={Plus}
            disabled={activeTypes.length === 0}
            fields={expenseFields({ types: activeTypes, cards, employees: employeeOptions })}
            initialValues={{ expenseTypeId: "", amount: "", quantity: "", expenseDate: todayIso(), ...paymentInitialValues, employeeUserId: "", description: "" }}
            submitLabel="Gider ekle"
            onSubmit={async (values) => {
              await expenseApi.create(toRequest(values, allTypes));
              await refresh();
            }}
          />
        }
      />
      {expenseTypes.data && activeTypes.length === 0 && (
        <p className="ui-muted">Önce işletme sahibinin Tanımlar → Gider Türleri sayfasından en az bir gider türü tanımlaması gerekiyor.</p>
      )}

      <Section
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
              rowActions={(row) =>
                row.sourceReferenceType ? (
                  <span className="ui-muted ui-inline-note" title="Kaynağındaki kayıttan yönetilir">
                    <Bot size={14} aria-hidden="true" /> Otomatik
                  </span>
                ) : (
                  <>
                    <button type="button" className="ui-button secondary small" onClick={() => setEditing(row)}>
                      <Pencil size={14} aria-hidden="true" />
                      Düzenle
                    </button>
                    <DeleteButton onClick={() => setDeleting(row)} />
                  </>
                )
              }
            />
          )}
        </AsyncState>
      </Section>

      {editing && (
        <Modal title={`${editing.expenseTypeName} — düzenle`} onClose={() => setEditing(null)}>
          <EntityForm
            fields={expenseFields({ types: allTypes, cards, employees: employeeOptions })}
            initialValues={toFormValues(editing)}
            submitLabel="Kaydet"
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              await expenseApi.update(editing.id, toRequest(values, allTypes));
              setEditing(null);
              await refresh();
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
            await refresh();
          }}
        />
      )}
    </div>
  );
}
