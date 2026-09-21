import { useState } from "react";
import { recurringExpenseApi } from "../../api/moduleApis";
import { CrudPage } from "../../components/crud/CrudPage";
import { EntityForm, type FieldDef } from "../../components/ui/EntityForm";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { Modal } from "../../components/ui/Modal";
import { ActiveBadge, StatusBadge } from "../../components/ui/StatusBadge";
import { formatDate, formatMoney, todayIso } from "../../lib/format";
import { RECURRING_PERIOD_LABELS, toOptions, type RecurringPeriod } from "../../types/enums";
import type { RecurringExpenseDto } from "../../types/recurringExpense";

const baseFields: FieldDef[] = [
  { name: "name", label: "Gider adı", required: true, placeholder: "örn. Kira" },
  { name: "amount", label: "Tutar (₺)", type: "number", required: true, min: 0 },
  { name: "period", label: "Periyot", type: "select", required: true, options: toOptions(RECURRING_PERIOD_LABELS) },
];

function toBaseRequest(values: FormValues) {
  return {
    name: formValue.text(values, "name"),
    amount: formValue.number(values, "amount"),
    period: formValue.number(values, "period") as RecurringPeriod,
  };
}

/** Kira/elektrik gibi periyodik giderler; ödenmeyen dönemler için hatırlatma üretilir (bkz. proje raporu 3.8). */
export function RecurringExpensesPage() {
  const [paying, setPaying] = useState<{ row: RecurringExpenseDto; onPaid: (row: RecurringExpenseDto) => void } | null>(null);

  return (
    <>
      <CrudPage<RecurringExpenseDto>
        icon="🔁"
        title="Düzenli Giderler"
        description="Sistem her gider için güncel dönemi hesaplar; dönem ödenmeden biterse bildirim gelir."
        load={recurringExpenseApi.getAll}
        emptyText="Henüz düzenli gider yok — kira, elektrik gibi giderleri yukarıdan ekleyin."
        rowClassName={(row) => (row.isActive && !row.isCurrentPeriodPaid ? "warning" : undefined)}
        columns={[
          { header: "Ad", render: (row) => row.name },
          { header: "Tutar", align: "right", render: (row) => formatMoney(row.amount) },
          { header: "Periyot", render: (row) => RECURRING_PERIOD_LABELS[row.period] },
          {
            header: "Güncel dönem",
            render: (row) => `${formatDate(row.currentPeriodStartDate)} – ${formatDate(row.currentPeriodEndDate)}`,
          },
          {
            header: "Ödeme",
            render: (row) =>
              row.isCurrentPeriodPaid ? <StatusBadge tone="success">Ödendi</StatusBadge> : <StatusBadge tone="danger">Ödenmedi</StatusBadge>,
          },
          { header: "Durum", render: (row) => <ActiveBadge isActive={row.isActive} /> },
        ]}
        rowActions={(row, helpers) =>
          row.isCurrentPeriodPaid || !row.isActive ? null : (
            <button type="button" className="ui-button small" onClick={() => setPaying({ row, onPaid: helpers.replaceRow })}>
              Ödendi işaretle
            </button>
          )
        }
        createTitle="Yeni düzenli gider"
        createFields={[...baseFields, { name: "startDate", label: "Başlangıç tarihi", type: "date", required: true }]}
        createInitialValues={{ name: "", amount: "", period: "1", startDate: todayIso() }}
        onCreate={(values) => recurringExpenseApi.create({ ...toBaseRequest(values), startDate: formValue.text(values, "startDate") })}
        editTitle={(row) => `${row.name} — düzenle`}
        editFields={[...baseFields, { name: "isActive", label: "Aktif", type: "checkbox" }]}
        toEditValues={(row) => ({ name: row.name, amount: String(row.amount), period: String(row.period), isActive: row.isActive })}
        onUpdate={(row, values) =>
          recurringExpenseApi.update(row.id, { ...toBaseRequest(values), isActive: formValue.bool(values, "isActive") })
        }
      />

      {paying && (
        <Modal title={`${paying.row.name} — dönemi ödendi işaretle`} onClose={() => setPaying(null)}>
          <p className="ui-muted">
            Dönem: {formatDate(paying.row.currentPeriodStartDate)} – {formatDate(paying.row.currentPeriodEndDate)}
          </p>
          <EntityForm
            fields={[
              { name: "paidAmount", label: "Ödenen tutar (₺)", type: "number", required: true, min: 0 },
              { name: "paidDate", label: "Ödeme tarihi", type: "date", required: true },
            ]}
            initialValues={{ paidAmount: String(paying.row.amount), paidDate: todayIso() }}
            submitLabel="Kaydet"
            onCancel={() => setPaying(null)}
            onSubmit={async (values) => {
              const updated = await recurringExpenseApi.markPeriodPaid(paying.row.id, {
                periodStartDate: paying.row.currentPeriodStartDate,
                periodEndDate: paying.row.currentPeriodEndDate,
                paidAmount: formValue.number(values, "paidAmount"),
                paidDate: formValue.text(values, "paidDate"),
              });
              paying.onPaid(updated);
              setPaying(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
