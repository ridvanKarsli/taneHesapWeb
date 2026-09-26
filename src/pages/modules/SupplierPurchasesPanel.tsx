import { Banknote, Plus, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { ingredientApi, supplierApi } from "../../api/moduleApis";
import { AsyncState } from "../../components/ui/AsyncState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { EntityForm } from "../../components/ui/EntityForm";
import { formValue } from "../../components/ui/formValues";
import { Modal } from "../../components/ui/Modal";
import { ModalFormButton } from "../../components/ui/ModalFormButton";
import { Money } from "../../components/ui/Money";
import { paymentFields, paymentInitialValues, readPayment } from "../../components/ui/paymentFields";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAsyncData } from "../../hooks/useAsyncData";
import { usePaymentCards } from "../../hooks/usePaymentCards";
import { PAYMENT_METHOD_LABELS } from "../../types/enums";
import { formatDate, formatNumber, todayIso } from "../../lib/format";
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
  const { cards } = usePaymentCards();
  const [paying, setPaying] = useState<SupplierPurchaseDto | null>(null);
  const [undoing, setUndoing] = useState<{ purchase: SupplierPurchaseDto; paymentId: string; amount: number } | null>(null);
  const [deleting, setDeleting] = useState<SupplierPurchaseDto | null>(null);

  function replacePurchase(updated: SupplierPurchaseDto) {
    purchases.setData((current) => current?.map((p) => (p.id === updated.id ? updated : p)) ?? current);
    onChanged();
  }

  const ingredientOptions = (ingredients.data ?? [])
    .filter((i) => i.isActive)
    .map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` }));

  return (
    <div>
      <div className="wallet-toolbar">
        <h3 className="ui-subheading">Alış geçmişi</h3>
        <ModalFormButton
          label="Yeni alış"
          icon={Plus}
          buttonClassName="ui-button small"
          intro={<p className="ui-muted">Alış kaydedilince malzemenin stoğu artar ve birim fiyatı bu alışa göre güncellenir. Ödeme ayrıca girilir.</p>}
          fields={[
            { name: "ingredientId", label: "Malzeme", type: "select", required: true, options: ingredientOptions },
            { name: "quantity", label: "Miktar", type: "number", required: true, min: 0 },
            { name: "unitPrice", label: "Birim fiyat (₺)", type: "number", required: true, min: 0 },
            { name: "purchaseDate", label: "Tarih", type: "date", required: true },
          ]}
          initialValues={{ ingredientId: "", quantity: "", unitPrice: "", purchaseDate: todayIso() }}
          submitLabel="Alışı kaydet"
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
      </div>
      <AsyncState {...purchases} isEmpty={(rows) => rows.length === 0} emptyText="Bu tedarikçiden henüz alış yok.">
        {(rows) => (
          <DataTable
            rows={rows}
            rowKey={(row) => row.id}
            columns={[
              { header: "Tarih", render: (row) => formatDate(row.purchaseDate) },
              { header: "Malzeme", render: (row) => row.ingredientName },
              { header: "Miktar", align: "right", render: (row) => formatNumber(row.quantity) },
              { header: "Birim fiyat", align: "right", render: (row) => <Money value={row.unitPrice} /> },
              { header: "Tutar", align: "right", render: (row) => <Money value={row.totalAmount} /> },
              {
                header: "Ödenen",
                align: "right",
                render: (row) => (
                  <span className="purchase-payments">
                    <Money value={row.paidAmount} />
                    {row.payments.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="purchase-payment-chip"
                        title="Bu ödemeyi geri al"
                        onClick={() => setUndoing({ purchase: row, paymentId: p.id, amount: p.amount })}
                      >
                        {formatDate(p.paymentDate)} · {p.paymentMethod === null ? "—" : PAYMENT_METHOD_LABELS[p.paymentMethod]} · <Money value={p.amount} />
                        <Undo2 size={12} aria-hidden="true" />
                      </button>
                    ))}
                  </span>
                ),
              },
              {
                header: "Durum",
                render: (row) =>
                  row.isFullyPaid ? (
                    <StatusBadge tone="success">Ödendi</StatusBadge>
                  ) : (
                    <StatusBadge tone="danger">Kalan <Money value={row.remainingAmount} /></StatusBadge>
                  ),
              },
            ]}
            rowActions={(row) => (
              <div className="ui-row-actions-inner">
                {!row.isFullyPaid && (
                  <button type="button" className="ui-button small" onClick={() => setPaying(row)}>
                    <Banknote size={14} aria-hidden="true" />
                    Ödeme yap
                  </button>
                )}
                {row.payments.length === 0 && (
                  <button type="button" className="ui-button danger-ghost small" onClick={() => setDeleting(row)} aria-label="Alışı sil" title="Alışı sil">
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          />
        )}
      </AsyncState>

      {undoing && (
        <ConfirmDialog
          title="Ödemeyi geri al"
          confirmLabel="Geri al"
          message={`${undoing.purchase.ingredientName} alışına yapılan ${undoing.amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })} ödeme silinecek; otomatik gider ve kasa hareketi de geri alınır.`}
          onClose={() => setUndoing(null)}
          onConfirm={async () => {
            replacePurchase(await supplierApi.removePayment(undoing.purchase.id, undoing.paymentId));
            setUndoing(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Alışı sil"
          message={`${formatDate(deleting.purchaseDate)} tarihli ${formatNumber(deleting.quantity)} birim ${deleting.ingredientName} alışı silinecek; stok girişi geri alınır.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await supplierApi.removePurchase(deleting.id);
            purchases.setData((current) => current?.filter((p) => p.id !== deleting.id) ?? current);
            onChanged();
            setDeleting(null);
          }}
        />
      )}

      {paying && (
        <Modal title={`${paying.ingredientName} alışı — ödeme`} onClose={() => setPaying(null)}>
          <p className="ui-muted">Kalan borç: <Money value={paying.remainingAmount} />. Ödeme, seçilen kasadan/karttan düşen bir Malzeme gideri olarak da işlenir.</p>
          <EntityForm
            fields={[
              { name: "amount", label: "Ödeme tutarı (₺)", type: "number", required: true, min: 0 },
              { name: "paymentDate", label: "Ödeme tarihi", type: "date", required: true },
              ...paymentFields(cards),
            ]}
            initialValues={{ amount: String(paying.remainingAmount), paymentDate: todayIso(), ...paymentInitialValues }}
            submitLabel="Ödemeyi kaydet"
            onCancel={() => setPaying(null)}
            onSubmit={async (values) => {
              replacePurchase(
                await supplierApi.addPayment(paying.id, {
                  amount: formValue.number(values, "amount"),
                  paymentDate: formValue.text(values, "paymentDate"),
                  ...readPayment(values),
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
