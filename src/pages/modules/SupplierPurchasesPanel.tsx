import { Banknote, Plus } from "lucide-react";
import { useState } from "react";
import { ingredientApi, supplierApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { DataTable } from "../../components/ui/DataTable";
import { EntityForm } from "../../components/ui/EntityForm";
import { formValue } from "../../components/ui/formValues";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import { formatDate, formatMoney, formatNumber, todayIso } from "../../lib/format";
import type { SupplierPurchaseDto } from "../../types/supplier";

interface SupplierPurchasesPanelProps {
  supplierId: string;
  /** Alış/ödeme sonrası tedarikçinin borç toplamlarının yenilenmesi için. */
  onChanged: () => void;
}

/** Bir tedarikçinin alışları: yeni alış (stok + birim fiyat günceller) ve alışa karşı (kısmi) ödeme. */
export function SupplierPurchasesPanel({ supplierId, onChanged }: SupplierPurchasesPanelProps) {
  const purchases = useAsyncData(() => supplierApi.getPurchases(supplierId), supplierId);
  const ingredients = useAsyncData(ingredientApi.getAll);
  const [paying, setPaying] = useState<SupplierPurchaseDto | null>(null);

  function replacePurchase(updated: SupplierPurchaseDto) {
    purchases.setData((current) => current?.map((p) => (p.id === updated.id ? updated : p)) ?? current);
    onChanged();
  }

  const ingredientOptions = (ingredients.data ?? [])
    .filter((i) => i.isActive)
    .map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` }));

  return (
    <div>
      <h3 className="ui-subheading">Yeni alış</h3>
      <EntityForm
        layout="inline"
        fields={[
          { name: "ingredientId", label: "Malzeme", type: "select", required: true, options: ingredientOptions },
          { name: "quantity", label: "Miktar", type: "number", required: true, min: 0 },
          { name: "unitPrice", label: "Birim fiyat (₺)", type: "number", required: true, min: 0 },
          { name: "purchaseDate", label: "Tarih", type: "date", required: true },
        ]}
        initialValues={{ ingredientId: "", quantity: "", unitPrice: "", purchaseDate: todayIso() }}
        submitLabel="Alış ekle"
        submitIcon={Plus}
        resetOnSuccess
        onSubmit={async (values) => {
          const created = await supplierApi.addPurchase(supplierId, {
            ingredientId: formValue.text(values, "ingredientId"),
            quantity: formValue.number(values, "quantity"),
            unitPrice: formValue.number(values, "unitPrice"),
            purchaseDate: formValue.text(values, "purchaseDate"),
          });
          purchases.setData((current) => [created, ...(current ?? [])]);
          onChanged();
        }}
      />

      <h3 className="ui-subheading">Alış geçmişi</h3>
      <AsyncState {...purchases} isEmpty={(rows) => rows.length === 0} emptyText="Bu tedarikçiden henüz alış yok.">
        {(rows) => (
          <DataTable
            rows={rows}
            rowKey={(row) => row.id}
            columns={[
              { header: "Tarih", render: (row) => formatDate(row.purchaseDate) },
              { header: "Malzeme", render: (row) => row.ingredientName },
              { header: "Miktar", align: "right", render: (row) => formatNumber(row.quantity) },
              { header: "Birim fiyat", align: "right", render: (row) => formatMoney(row.unitPrice) },
              { header: "Tutar", align: "right", render: (row) => formatMoney(row.totalAmount) },
              { header: "Ödenen", align: "right", render: (row) => formatMoney(row.paidAmount) },
              {
                header: "Durum",
                render: (row) =>
                  row.isFullyPaid ? (
                    <StatusBadge tone="success">Ödendi</StatusBadge>
                  ) : (
                    <StatusBadge tone="danger">{`Kalan ${formatMoney(row.remainingAmount)}`}</StatusBadge>
                  ),
              },
            ]}
            rowActions={(row) =>
              row.isFullyPaid ? null : (
                <button type="button" className="ui-button small" onClick={() => setPaying(row)}>
                  <Banknote size={14} aria-hidden="true" />
                  Ödeme yap
                </button>
              )
            }
          />
        )}
      </AsyncState>

      {paying && (
        <Modal title={`${paying.ingredientName} alışı — ödeme`} onClose={() => setPaying(null)}>
          <p className="ui-muted">Kalan borç: {formatMoney(paying.remainingAmount)}</p>
          <EntityForm
            fields={[
              { name: "amount", label: "Ödeme tutarı (₺)", type: "number", required: true, min: 0 },
              { name: "paymentDate", label: "Ödeme tarihi", type: "date", required: true },
            ]}
            initialValues={{ amount: String(paying.remainingAmount), paymentDate: todayIso() }}
            submitLabel="Ödemeyi kaydet"
            onCancel={() => setPaying(null)}
            onSubmit={async (values) => {
              replacePurchase(
                await supplierApi.addPayment(paying.id, {
                  amount: formValue.number(values, "amount"),
                  paymentDate: formValue.text(values, "paymentDate"),
                }),
              );
              setPaying(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
