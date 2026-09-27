import { expenseTypeApi } from "../../api/moduleApis";
import type { FieldDef } from "../../components/ui/EntityForm";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { EXPENSE_CATEGORY_LABELS, ExpenseCategory, toOptions } from "../../types/enums";
import type { ExpenseTypeDto } from "../../types/expenseType";

/**
 * Gider formundaki "Gider türü" seçimi. Ayrı bir Gider Türleri sayfası yoktur: listede olmayan tür, listenin
 * sonundaki "+ Yeni tür ekle" ile formun içinde tanımlanır ve gider kaydedilirken oluşturulur
 * (aynı adda tür varsa sunucu yenisini açmaz, mevcut türü döndürür).
 */
export const NEW_EXPENSE_TYPE = "__new";

const isNewType = (values: FormValues) => formValue.text(values, "expenseTypeId") === NEW_EXPENSE_TYPE;

export function expenseTypeFields(types: ExpenseTypeDto[]): FieldDef[] {
  return [
    {
      name: "expenseTypeId",
      label: "Gider türü",
      type: "select",
      required: true,
      options: [
        ...types.map((t) => ({ value: t.id, label: `${t.name} (${t.unit})` })),
        { value: NEW_EXPENSE_TYPE, label: "+ Yeni tür ekle…" },
      ],
    },
    { name: "newTypeName", label: "Yeni türün adı", required: true, placeholder: "örn. Tüp gaz", visibleWhen: isNewType },
    {
      name: "newTypeCategory",
      label: "Kategori",
      type: "select",
      required: true,
      options: toOptions(EXPENSE_CATEGORY_LABELS),
      visibleWhen: isNewType,
    },
    { name: "newTypeUnit", label: "Birim (opsiyonel)", placeholder: "adet, kg, lt", visibleWhen: isNewType },
  ];
}

export const expenseTypeInitialValues: FormValues = {
  expenseTypeId: "",
  newTypeName: "",
  newTypeCategory: String(ExpenseCategory.Other),
  newTypeUnit: "",
};

/** Seçili (ya da yeni tanımlanan) türün kategorisi — Personel ise çalışan seçimi açılır. */
export function selectedExpenseCategory(values: FormValues, types: ExpenseTypeDto[]): ExpenseCategory | undefined {
  if (isNewType(values)) {
    return formValue.number(values, "newTypeCategory") as ExpenseCategory;
  }
  return types.find((t) => t.id === values.expenseTypeId)?.category;
}

/** Seçili türün kimliği; "+ Yeni tür" seçildiyse tür önce oluşturulur. */
export async function resolveExpenseTypeId(values: FormValues): Promise<string> {
  if (!isNewType(values)) {
    return formValue.text(values, "expenseTypeId");
  }
  const created = await expenseTypeApi.create({
    name: formValue.text(values, "newTypeName"),
    unit: formValue.text(values, "newTypeUnit"),
    category: formValue.number(values, "newTypeCategory") as ExpenseCategory,
  });
  return created.id;
}
