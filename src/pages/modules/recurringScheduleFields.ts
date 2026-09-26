import type { FieldDef } from "../../components/ui/EntityForm";
import { formValue, type FormValues } from "../../components/ui/formValues";
import {
  RECURRING_PERIOD_UNITS,
  RecurringPeriod,
  recurringScheduleLabel,
  toOptions,
} from "../../types/enums";

/**
 * Düzenli giderin periyodu tek açılır listeden seçilir ("Aylık", "3 ayda bir", "6 ayda bir"…). Listede olmayan
 * bir periyot için "Özel" seçilir; o zaman "Kaç" + "hafta/ay/yıl" alanları açılır (örn. 5 ayda bir).
 * Değer "birim:sayı" olarak tutulur (örn. "1:3" = 3 ayda bir) — backend'e period + intervalCount olarak gider.
 */
const CUSTOM = "custom";

const PRESETS: { period: RecurringPeriod; count: number }[] = [
  { period: RecurringPeriod.Weekly, count: 1 },
  { period: RecurringPeriod.Weekly, count: 2 },
  { period: RecurringPeriod.Monthly, count: 1 },
  { period: RecurringPeriod.Monthly, count: 2 },
  { period: RecurringPeriod.Monthly, count: 3 },
  { period: RecurringPeriod.Monthly, count: 4 },
  { period: RecurringPeriod.Monthly, count: 6 },
  { period: RecurringPeriod.Yearly, count: 1 },
];

const presetValue = (period: RecurringPeriod, count: number) =>
  `${period}:${count}`;

const SCHEDULE_OPTIONS = [
  ...PRESETS.map((p) => ({
    value: presetValue(p.period, p.count),
    label: recurringScheduleLabel(p.period, p.count),
  })),
  { value: CUSTOM, label: "Özel (kendim belirleyeceğim)…" },
];

const isCustom = (values: FormValues) =>
  formValue.text(values, "schedule") === CUSTOM;

export const recurringScheduleFields: FieldDef[] = [
  {
    name: "schedule",
    label: "Periyot",
    type: "select",
    required: true,
    options: SCHEDULE_OPTIONS,
  },
  {
    name: "customCount",
    label: "Kaç",
    type: "number",
    required: true,
    min: 1,
    step: "1",
    placeholder: "örn. 5",
    visibleWhen: isCustom,
  },
  {
    name: "customPeriod",
    label: "Birim",
    type: "select",
    required: true,
    options: toOptions(RECURRING_PERIOD_UNITS),
    visibleWhen: isCustom,
    hint: (values) => {
      const { period, intervalCount } = readRecurringSchedule(values);
      return formValue.text(values, "customPeriod") !== ""
        ? `Seçim: ${recurringScheduleLabel(period, intervalCount)}`
        : undefined;
    },
  },
];

/** Form değerleri → backend alanları. */
export function readRecurringSchedule(values: FormValues): {
  period: RecurringPeriod;
  intervalCount: number;
} {
  if (isCustom(values)) {
    return {
      period: formValue.number(values, "customPeriod") as RecurringPeriod,
      intervalCount: Math.max(
        1,
        Math.round(formValue.optionalNumber(values, "customCount") ?? 1),
      ),
    };
  }
  const [period, count] = formValue
    .text(values, "schedule")
    .split(":")
    .map(Number);
  return { period: period as RecurringPeriod, intervalCount: count || 1 };
}

/** Kayıttaki periyot → form değerleri (hazır seçenekte yoksa "Özel" açılır). */
export function recurringScheduleValues(
  period: RecurringPeriod,
  intervalCount: number,
): FormValues {
  const count = intervalCount || 1;
  const isPreset = PRESETS.some(
    (p) => p.period === period && p.count === count,
  );
  return isPreset
    ? {
        schedule: presetValue(period, count),
        customCount: "",
        customPeriod: String(RecurringPeriod.Monthly),
      }
    : {
        schedule: CUSTOM,
        customCount: String(count),
        customPeriod: String(period),
      };
}
