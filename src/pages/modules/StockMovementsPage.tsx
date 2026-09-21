import { useState } from "react";
import { ingredientApi, stockMovementApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { EntityForm } from "../../components/ui/EntityForm";
import { formValue } from "../../components/ui/formValues";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Section";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDateTime, formatNumber } from "../../lib/format";
import { STOCK_MOVEMENT_TYPE_LABELS, StockMovementType } from "../../types/enums";

/** Manuel girilebilen hareket tipleri — alış (Tedarikçiler) ve satış tüketimi (Gün Sonu) otomatik oluşur. */
const MANUAL_TYPE_OPTIONS = [
  { value: String(StockMovementType.ManualAdjustment), label: STOCK_MOVEMENT_TYPE_LABELS[StockMovementType.ManualAdjustment] },
  { value: String(StockMovementType.Waste), label: STOCK_MOVEMENT_TYPE_LABELS[StockMovementType.Waste] },
];

/** Fire her zaman stoktan düşer; sayım düzeltmesinde işaret kullanıcıya bırakılır (+ ekler, − düşer). */
function toQuantityChange(type: StockMovementType, quantity: number): number {
  return type === StockMovementType.Waste ? -Math.abs(quantity) : quantity;
}

/** Stok hareketleri geçmişi ve manuel düzeltme/fire girişi (bkz. proje raporu 3.9). */
export function StockMovementsPage() {
  const [ingredientFilter, setIngredientFilter] = useState("");
  const ingredients = useAsyncData(ingredientApi.getAll);
  const movements = useAsyncData(() => stockMovementApi.getAll(ingredientFilter || undefined), ingredientFilter);

  const ingredientOptions = (ingredients.data ?? []).map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` }));

  return (
    <div>
      <PageHeader
        icon="📦"
        title="Stok Hareketleri"
        description="Alışlar tedarikçi modülünden, satış tüketimi gün sonu kapanışından otomatik gelir. Burada sayım düzeltmesi ve fire girilir."
      />

      <Section title="Manuel stok hareketi">
        <EntityForm
          layout="inline"
          fields={[
            { name: "ingredientId", label: "Malzeme", type: "select", required: true, options: ingredientOptions },
            { name: "movementType", label: "Hareket tipi", type: "select", required: true, options: MANUAL_TYPE_OPTIONS },
            { name: "quantity", label: "Miktar (düzeltmede − stoktan düşer)", type: "number", required: true },
            { name: "note", label: "Not", type: "textarea" },
          ]}
          initialValues={{ ingredientId: "", movementType: String(StockMovementType.ManualAdjustment), quantity: "", note: "" }}
          submitLabel="Kaydet"
          resetOnSuccess
          onSubmit={async (values) => {
            const movementType = formValue.number(values, "movementType") as StockMovementType;
            await stockMovementApi.create({
              ingredientId: formValue.text(values, "ingredientId"),
              movementType,
              quantityChange: toQuantityChange(movementType, formValue.number(values, "quantity")),
              note: formValue.optionalText(values, "note"),
            });
            await Promise.all([movements.reload(), ingredients.reload()]);
          }}
        />
      </Section>

      <Section
        title="Hareket geçmişi"
        actions={
          <div className="ui-filter">
            <label htmlFor="stock-ingredient">Malzeme</label>
            <select id="stock-ingredient" value={ingredientFilter} onChange={(e) => setIngredientFilter(e.target.value)}>
              <option value="">Tümü</option>
              {ingredientOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <AsyncState {...movements} isEmpty={(rows) => rows.length === 0} emptyText="Henüz stok hareketi yok.">
          {(rows) => (
            <DataTable
              rows={rows}
              rowKey={(row) => row.id}
              columns={[
                { header: "Tarih", render: (row) => formatDateTime(row.movementDateUtc) },
                { header: "Malzeme", render: (row) => row.ingredientName },
                {
                  header: "Tip",
                  render: (row) => (
                    <StatusBadge tone={row.movementType === StockMovementType.Waste ? "danger" : "neutral"}>
                      {STOCK_MOVEMENT_TYPE_LABELS[row.movementType]}
                    </StatusBadge>
                  ),
                },
                {
                  header: "Değişim",
                  align: "right",
                  render: (row) => (
                    <span className={row.quantityChange < 0 ? "ui-text-negative" : "ui-text-positive"}>
                      {row.quantityChange > 0 ? "+" : ""}
                      {formatNumber(row.quantityChange)}
                    </span>
                  ),
                },
                { header: "Sonraki stok", align: "right", render: (row) => formatNumber(row.resultingStockQuantity) },
                { header: "Not", render: (row) => row.note || "—" },
              ]}
            />
          )}
        </AsyncState>
      </Section>
    </div>
  );
}
