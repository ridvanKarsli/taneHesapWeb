import { useState } from "react";
import { recurringExpenseApi } from "../../api/moduleApis";
import { CrudPage } from "../../components/crud/CrudPage";
import type { FieldDef } from "../../components/ui/EntityForm";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { Money } from "../../components/ui/Money";
import { ActiveBadge, StatusBadge } from "../../components/ui/StatusBadge";
import { usePaymentCards } from "../../hooks/usePaymentCards";
import { formatDate, todayIso } from "../../lib/format";
import { RecurringPeriod, recurringScheduleLabel } from "../../types/enums";
import type { RecurringExpenseDto } from "../../types/recurringExpense";
import { RecurringPayables } from "./RecurringPayables";
import {
  readRecurringSchedule,
  recurringScheduleFields,
  recurringScheduleValues,
} from "./recurringScheduleFields";
import "./modules.css";

const baseFields: FieldDef[] = [
  {
    name: "name",
    label: "Gider adı",
    required: true,
    placeholder: "örn. Kira, stopaj, sigorta",
  },
  {
    name: "amount",
    label: "Tutar (₺)",
    type: "number",
    required: true,
    min: 0,
  },
  ...recurringScheduleFields,
];

function toBaseRequest(values: FormValues) {
  return {
    name: formValue.text(values, "name"),
    amount: formValue.number(values, "amount"),
    ...readRecurringSchedule(values),
  };
}

/**
 * Düzenli giderler iki parçadır: üstte "Ödenecekler" (ödenmemiş dönemler; satırda nereden ödeneceği seçilip
 * "Öde" denir, satır listeden çıkar), altta tanımlar (kira, fatura; periyot serbest: "3 ayda bir" gibi).
 */
export function RecurringExpensesPage() {
  const { cards } = usePaymentCards();
  const [version, setVersion] = useState(0);
  const changed = () => setVersion((v) => v + 1);
  const bumpAfter = async <T,>(action: Promise<T>) => {
    const result = await action;
    changed();
    return result;
  };

  return (
    <CrudPage<RecurringExpenseDto>
      summary={
        <RecurringPayables
          cards={cards}
          reloadKey={String(version)}
          onPaid={changed}
        />
      }
      listTitle="Tanımlı düzenli giderler"
      reloadKey={String(version)}
      load={recurringExpenseApi.getAll}
      emptyText="Henüz düzenli gider yok — kira, fatura gibi giderleri “Yeni düzenli gider” ile ekleyin."
      columns={[
        {
          header: "Ad",
          render: (row) => <span className="ui-cell-strong">{row.name}</span>,
        },
        {
          header: "Tutar",
          align: "right",
          render: (row) => <Money value={row.amount} />,
        },
        {
          header: "Periyot",
          render: (row) =>
            recurringScheduleLabel(row.period, row.intervalCount),
        },
        {
          header: "Güncel dönem",
          render: (row) =>
            `${formatDate(row.currentPeriodStartDate)} – ${formatDate(row.currentPeriodEndDate)}`,
        },
        {
          header: "Bu dönem",
          render: (row) =>
            !row.isActive ? (
              <ActiveBadge isActive={false} />
            ) : row.isCurrentPeriodPaid ? (
              <StatusBadge tone="success">Ödendi</StatusBadge>
            ) : (
              <StatusBadge tone="warning">Ödenecek</StatusBadge>
            ),
        },
      ]}
      createLabel="Yeni düzenli gider"
      createFields={[
        ...baseFields,
        {
          name: "startDate",
          label: "İlk dönemin başlangıcı",
          type: "date",
          required: true,
        },
      ]}
      createInitialValues={{
        name: "",
        amount: "",
        ...recurringScheduleValues(RecurringPeriod.Monthly, 1),
        startDate: todayIso(),
      }}
      onCreate={(values) =>
        bumpAfter(
          recurringExpenseApi.create({
            ...toBaseRequest(values),
            startDate: formValue.text(values, "startDate"),
          }),
        )
      }
      onDelete={(row) => bumpAfter(recurringExpenseApi.remove(row.id))}
      describeRow={(row) => row.name}
      editTitle={(row) => `${row.name} — düzenle`}
      editFields={[
        ...baseFields,
        { name: "isActive", label: "Aktif", type: "checkbox" },
      ]}
      toEditValues={(row) => ({
        name: row.name,
        amount: String(row.amount),
        ...recurringScheduleValues(row.period, row.intervalCount),
        isActive: row.isActive,
      })}
      onUpdate={(row, values) =>
        bumpAfter(
          recurringExpenseApi.update(row.id, {
            ...toBaseRequest(values),
            isActive: formValue.bool(values, "isActive"),
          }),
        )
      }
    />
  );
}
