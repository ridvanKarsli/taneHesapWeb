import { ingredientApi } from "../../api/moduleApis";
import { CrudPage } from "../../components/crud/CrudPage";
import { type FieldDef } from "../../components/ui/EntityForm";
import { formValue, type FormValues } from "../../components/ui/formValues";
import { Money } from "../../components/ui/Money";
import { ActiveBadge, StatusBadge } from "../../components/ui/StatusBadge";
import { formatNumber } from "../../lib/format";
import type { IngredientDto } from "../../types/ingredient";

const baseFields: FieldDef[] = [
  { name: "name", label: "Malzeme adı", required: true, placeholder: "örn. Baldo pirinç" },
  { name: "unit", label: "Birim", required: true, placeholder: "kg, lt, adet" },
  { name: "currentUnitPrice", label: "Birim fiyat (₺)", type: "number", required: true, min: 0 },
  { name: "minimumStockThreshold", label: "Minimum stok eşiği", type: "number", required: true, min: 0 },
];

function toRequest(values: FormValues) {
  return {
    name: formValue.text(values, "name"),
    unit: formValue.text(values, "unit"),
    currentUnitPrice: formValue.number(values, "currentUnitPrice"),
    minimumStockThreshold: formValue.number(values, "minimumStockThreshold"),
  };
}

function isBelowThreshold(row: IngredientDto): boolean {
  return row.isActive && row.currentStockQuantity < row.minimumStockThreshold;
}

/**
 * Malzeme kartları (bkz. proje raporu 3.3, 3.9). Stok miktarı buradan değil stok hareketlerinden
 * (alış, gün sonu tüketimi, sayım/fire) değişir; birim fiyat da tedarikçi alışlarıyla güncellenir.
 */
export function IngredientsPage() {
  return (
    <CrudPage<IngredientDto>
      load={ingredientApi.getAll}
      emptyText="Henüz malzeme yok — ilk malzemeyi sağ üstteki düğmeyle ekleyin."
      rowClassName={(row) => (isBelowThreshold(row) ? "warning" : undefined)}
      columns={[
        { header: "Ad", render: (row) => row.name },
        { header: "Birim fiyat", align: "right", render: (row) => (
            <span>
              <Money value={row.currentUnitPrice} /> / {row.unit}
            </span>
          ) },
        { header: "Stok", align: "right", render: (row) => `${formatNumber(row.currentStockQuantity)} ${row.unit}` },
        { header: "Min. eşik", align: "right", render: (row) => `${formatNumber(row.minimumStockThreshold)} ${row.unit}` },
        {
          header: "Durum",
          render: (row) =>
            isBelowThreshold(row) ? <StatusBadge tone="danger">Stok düşük</StatusBadge> : <ActiveBadge isActive={row.isActive} />,
        },
      ]}
      createLabel="Yeni malzeme"
      createFields={baseFields}
      createInitialValues={{ name: "", unit: "kg", currentUnitPrice: "", minimumStockThreshold: "0" }}
      onCreate={(values) => ingredientApi.create(toRequest(values))}
      onDelete={(row) => ingredientApi.remove(row.id)}
      describeRow={(row) => row.name}
      editTitle={(row) => `${row.name} — düzenle`}
      editFields={[...baseFields, { name: "isActive", label: "Aktif", type: "checkbox" }]}
      toEditValues={(row) => ({
        name: row.name,
        unit: row.unit,
        currentUnitPrice: String(row.currentUnitPrice),
        minimumStockThreshold: String(row.minimumStockThreshold),
        isActive: row.isActive,
      })}
      onUpdate={(row, values) => ingredientApi.update(row.id, { ...toRequest(values), isActive: formValue.bool(values, "isActive") })}
    />
  );
}
