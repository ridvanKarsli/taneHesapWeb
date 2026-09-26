import { useState } from "react";
import { recurringExpenseApi } from "../../api/moduleApis";
import { CrudPage } from "../../components/crud/CrudPage";
import type { FieldDef } from "../../components/ui/EntityForm";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { Money } from "../../components/ui/Money";
import { ActiveBadge, StatusBadge } from "../../components/ui/StatusBadge";
import { usePaymentCards } from "../../hooks/usePaymentCards";
import { formatDate, todayIso } from "../../lib/format";
import {
  RECURRING_PERIOD_UNITS,
  recurringScheduleLabel,
  toOptions,
  type RecurringPeriod,
} from "../../types/enums";
import type { RecurringExpenseDto } from "../../types/recurringExpense";
import { RecurringPayables } from "./RecurringPayables";
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
  {
    name: "intervalCount",
    label: "Tekrar sıklığı",
    type: "number",
    required: true,
    min: 1,
    step: "1",
    placeholder: "örn. 3",
  },
  {
    name: "period",
    label: "Birim",
    type: "select",
    required: true,
    options: toOptions(RECURRING_PERIOD_UNITS),
    hint: (values) => {
      const count = Math.round(
        formValue.optionalNumber(values, "intervalCount") ?? 0,
      );
      const period = formValue.text(values, "period");
      return count >= 1 && period !== ""
        ? `Seçim: ${recurringScheduleLabel(Number(period) as RecurringPeriod, count)}`
        : undefined;
    },
  },
];

function toBaseRequest(values: FormValues) {
  const period = formValue.number(values, "period") as RecurringPeriod;
  return {
    name: formValue.text(values, "name"),
    amount: formValue.number(values, "amount"),
    period,
    intervalCount: Math.max(
      1,
      Math.round(formValue.number(values, "intervalCount")),
    ),
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
        intervalCount: "1",
        period: "1",
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
        intervalCount: String(row.intervalCount),
        period: String(row.period),
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
