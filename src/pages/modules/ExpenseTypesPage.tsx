import { expenseTypeApi } from "../../api/moduleApis";
import { CrudPage } from "../../components/crud/CrudPage";
import { type FieldDef } from "../../components/ui/EntityForm";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { ActiveBadge } from "../../components/ui/StatusBadge";
import { EXPENSE_CATEGORY_LABELS, toOptions, type ExpenseCategory } from "../../types/enums";
import type { ExpenseTypeDto } from "../../types/expenseType";

const baseFields: FieldDef[] = [
  { name: "name", label: "Tür adı", required: true, placeholder: "örn. Pirinç" },
  { name: "unit", label: "Birim", required: true, placeholder: "kg, lt, adet" },
  { name: "category", label: "Kategori", type: "select", required: true, options: toOptions(EXPENSE_CATEGORY_LABELS) },
];

function toRequest(values: FormValues) {
  return {
    name: formValue.text(values, "name"),
    unit: formValue.text(values, "unit"),
    category: formValue.number(values, "category") as ExpenseCategory,
  };
}

/** ADMIN gider türü kataloğunu yönetir; EMPLOYEE bu türlere göre gider girer (bkz. proje raporu 3.2). */
export function ExpenseTypesPage() {
  return (
    <CrudPage<ExpenseTypeDto>
      title="Gider Türleri"
      description="Giderler bu türlere göre girilir. Çalışanlar sadece aktif türleri seçebilir."
      load={expenseTypeApi.getAll}
      emptyText="Henüz gider türü yok — ilk türü yukarıdan ekleyin."
      columns={[
        { header: "Ad", render: (row) => row.name },
        { header: "Birim", render: (row) => row.unit },
        { header: "Kategori", render: (row) => EXPENSE_CATEGORY_LABELS[row.category] },
        { header: "Durum", render: (row) => <ActiveBadge isActive={row.isActive} /> },
      ]}
      createTitle="Yeni gider türü"
      createFields={baseFields}
      createInitialValues={{ name: "", unit: "", category: "0" }}
      onCreate={(values) => expenseTypeApi.create(toRequest(values))}
      onDelete={(row) => expenseTypeApi.remove(row.id)}
      describeRow={(row) => row.name}
      editTitle={(row) => `${row.name} — düzenle`}
      editFields={[...baseFields, { name: "isActive", label: "Aktif", type: "checkbox" }]}
      toEditValues={(row) => ({ name: row.name, unit: row.unit, category: String(row.category), isActive: row.isActive })}
      onUpdate={(row, values) => expenseTypeApi.update(row.id, { ...toRequest(values), isActive: formValue.bool(values, "isActive") })}
    />
  );
}
