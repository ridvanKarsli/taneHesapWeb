import { useState } from "react";
import { dishApi, ingredientApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { EntityForm } from "../../components/ui/EntityForm";
import { formValue } from "../../components/ui/formValues";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Section";
import { ActiveBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatMoney, formatNumber } from "../../lib/format";
import type { DishDto, DishSizeDto } from "../../types/dish";
import { DishSizeForm } from "./DishSizeForm";
import "./modules.css";

type SizeDialog = { dish: DishDto; size?: DishSizeDto };

/**
 * Ürün (tabak) ve boy tanımları + reçete; maliyet ve kâr, reçete × güncel malzeme fiyatından
 * backend'de otomatik hesaplanır (bkz. proje raporu 3.3, 3.11).
 */
export function DishesPage() {
  const dishes = useAsyncData(dishApi.getAll);
  const ingredients = useAsyncData(ingredientApi.getAll);
  const [sizeDialog, setSizeDialog] = useState<SizeDialog | null>(null);
  const [openRecipeId, setOpenRecipeId] = useState<string | null>(null);

  const activeIngredients = (ingredients.data ?? []).filter((i) => i.isActive);

  return (
    <div>
      <PageHeader
        icon="🍚"
        title="Ürünler / Tabaklar"
        description="Her ürünün boylarını ve reçetesini tanımlayın; maliyet ve kâr güncel malzeme fiyatlarından hesaplanır."
      />

      <Section title="Yeni ürün">
        <EntityForm
          layout="inline"
          fields={[
            { name: "name", label: "Ürün adı", required: true, placeholder: "örn. Kavurmalı pilav" },
            { name: "description", label: "Açıklama" },
          ]}
          initialValues={{ name: "", description: "" }}
          submitLabel="Ürün ekle"
          resetOnSuccess
          onSubmit={async (values) => {
            const created = await dishApi.create({
              name: formValue.text(values, "name"),
              description: formValue.optionalText(values, "description"),
            });
            dishes.setData((current) => [...(current ?? []), created]);
          }}
        />
      </Section>

      <AsyncState {...dishes} isEmpty={(rows) => rows.length === 0} emptyText="Henüz ürün yok — ilk ürünü yukarıdan ekleyin.">
        {(rows) =>
          rows.map((dish) => (
            <Section
              key={dish.id}
              title={dish.name}
              actions={
                <button type="button" className="ui-button small" onClick={() => setSizeDialog({ dish })}>
                  + Boy ekle
                </button>
              }
            >
              {dish.description && <p className="ui-muted">{dish.description}</p>}
              {dish.sizes.length === 0 ? (
                <p className="ui-muted">Bu ürünün henüz boyu yok. Satış yapılabilmesi için en az bir boy ve reçete ekleyin.</p>
              ) : (
                <DataTable
                  rows={dish.sizes}
                  rowKey={(size) => size.id}
                  columns={[
                    { header: "Boy", render: (size) => size.name },
                    { header: "Satış fiyatı", align: "right", render: (size) => formatMoney(size.salePrice) },
                    { header: "Maliyet", align: "right", render: (size) => formatMoney(size.cost) },
                    {
                      header: "Kâr",
                      align: "right",
                      render: (size) => (
                        <span className={size.profitMargin < 0 ? "ui-text-negative" : "ui-text-positive"}>{formatMoney(size.profitMargin)}</span>
                      ),
                    },
                    { header: "Durum", render: (size) => <ActiveBadge isActive={size.isActive} /> },
                  ]}
                  rowActions={(size) => (
                    <>
                      <button type="button" className="ui-button secondary small" onClick={() => setOpenRecipeId((id) => (id === size.id ? null : size.id))}>
                        Reçete
                      </button>
                      <button type="button" className="ui-button secondary small" onClick={() => setSizeDialog({ dish, size })}>
                        Düzenle
                      </button>
                    </>
                  )}
                  renderExpanded={(size) =>
                    openRecipeId === size.id ? (
                      size.recipeItems.length === 0 ? (
                        <p className="ui-muted">Reçete boş — maliyet 0 görünür.</p>
                      ) : (
                        <DataTable
                          rows={size.recipeItems}
                          rowKey={(item) => item.ingredientId}
                          columns={[
                            { header: "Malzeme", render: (item) => item.ingredientName },
                            { header: "Miktar", align: "right", render: (item) => `${formatNumber(item.quantity)} ${item.unit}` },
                            { header: "Maliyet", align: "right", render: (item) => formatMoney(item.lineCost) },
                          ]}
                        />
                      )
                    ) : null
                  }
                />
              )}
            </Section>
          ))
        }
      </AsyncState>

      {sizeDialog && (
        <Modal
          title={sizeDialog.size ? `${sizeDialog.dish.name} — ${sizeDialog.size.name}` : `${sizeDialog.dish.name} — yeni boy`}
          onClose={() => setSizeDialog(null)}
        >
          <DishSizeForm
            ingredients={activeIngredients}
            initial={sizeDialog.size}
            onCancel={() => setSizeDialog(null)}
            onSubmit={async (values) => {
              const { dish, size } = sizeDialog;
              if (size) {
                await dishApi.updateSize(dish.id, size.id, values);
              } else {
                await dishApi.addSize(dish.id, { name: values.name, salePrice: values.salePrice, recipeItems: values.recipeItems });
              }
              setSizeDialog(null);
              await dishes.reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
