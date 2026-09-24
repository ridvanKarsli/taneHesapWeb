import { Check, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { extractErrorMessage } from "../../api/apiError";
import { ErrorMessage } from "../../components/ui/AsyncState";
import type { ImportRowRequest } from "../../types/dailySales";
import type { DishDto } from "../../types/dish";
import { PaymentMethod, SALES_CHANNEL_LABELS, SALES_PAYMENT_METHOD_LABELS, SalesChannel } from "../../types/enums";
import type { PlatformDto } from "../../types/platform";

interface SalesEntryFormProps {
  date: string;
  dishes: DishDto[];
  platforms: PlatformDto[];
  onSubmit: (rows: ImportRowRequest[]) => Promise<void>;
}

interface EntryRow {
  dishSizeId: string;
  quantity: string;
  totalAmount: string;
  paymentMethod: string;
  channel: string;
  platformId: string;
  discountAmount: string;
}

const emptyRow: EntryRow = {
  dishSizeId: "",
  quantity: "1",
  totalAmount: "",
  paymentMethod: String(PaymentMethod.Cash),
  channel: String(SalesChannel.InStore),
  platformId: "",
  discountAmount: "",
};

const toNumber = (value: string) => Number(value.replace(",", "."));

/**
 * Gün sonu satışlarının satır satır girişi. Excel şablonu netleşene kadar (bkz. proje raporu 3.5)
 * backend import'u ayrıştırılmış satırları kabul ediyor; bu form aynı `ImportRowRequest`'i üretir.
 * Tutar (net tahsilat), seçilen boyun satış fiyatı × adet − indirim olarak otomatik doldurulur ve elle değiştirilebilir.
 */
export function SalesEntryForm({ date, dishes, platforms, onSubmit }: SalesEntryFormProps) {
  const [rows, setRows] = useState<EntryRow[]>([{ ...emptyRow }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizes = dishes.filter((dish) => dish.isActive).flatMap((dish) =>
    dish.sizes.filter((size) => size.isActive).map((size) => ({ ...size, label: `${dish.name} — ${size.name}` })),
  );
  const priceOf = (sizeId: string) => sizes.find((size) => size.id === sizeId)?.salePrice ?? 0;
  const activePlatforms = platforms.filter((p) => p.isActive);

  function updateRow(index: number, patch: Partial<EntryRow>) {
    setRows((current) =>
      current.map((row, i) => {
        if (i !== index) {
          return row;
        }
        const next = { ...row, ...patch };
        // Tutar = tahsil edilen NET tutar: fiyat × adet − indirim (elle değiştirilebilir).
        if ("dishSizeId" in patch || "quantity" in patch || "discountAmount" in patch) {
          const gross = priceOf(next.dishSizeId) * toNumber(next.quantity || "0");
          next.totalAmount = String(Math.max(0, gross - toNumber(next.discountAmount || "0")));
        }
        return next;
      }),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const filled = rows.filter((row) => row.dishSizeId);
    if (filled.length === 0) {
      setError("En az bir satış satırı girin.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(
        filled.map((row) => {
          const channel = Number(row.channel) as SalesChannel;
          return {
            saleDate: date,
            saleTime: null,
            dishSizeId: row.dishSizeId,
            quantity: Math.round(toNumber(row.quantity)),
            totalAmount: toNumber(row.totalAmount || "0"),
            paymentMethod: Number(row.paymentMethod) as PaymentMethod,
            channel,
            platformId: channel === SalesChannel.Platform ? row.platformId || null : null,
            discountAmount: row.discountAmount ? toNumber(row.discountAmount) : null,
          };
        }),
      );
      setRows([{ ...emptyRow }]);
    } catch (submitError) {
      setError(extractErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sizes.length === 0) {
    return <p className="ui-muted">Satış girebilmek için önce "Ürünler / Tabaklar" sayfasından en az bir ürün ve boy tanımlayın.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="entry-row entry-row-header">
        <span>Ürün / boy</span>
        <span>Adet</span>
        <span>Net tutar (₺)</span>
        <span>Ödeme</span>
        <span>Kanal</span>
        <span>Platform</span>
        <span>İndirim</span>
        <span />
      </div>
      {rows.map((row, index) => {
        const isPlatform = Number(row.channel) === SalesChannel.Platform;
        return (
          <div className="entry-row" key={index}>
            <select className="ui-input" value={row.dishSizeId} onChange={(e) => updateRow(index, { dishSizeId: e.target.value })} aria-label="Ürün / boy">
              <option value="">Seçin…</option>
              {sizes.map((size) => (
                <option key={size.id} value={size.id}>
                  {size.label}
                </option>
              ))}
            </select>
            <input className="ui-input" type="number" min={1} step={1} value={row.quantity} onChange={(e) => updateRow(index, { quantity: e.target.value })} aria-label="Adet" placeholder="Adet" />
            <input className="ui-input" type="number" min={0} step="any" value={row.totalAmount} onChange={(e) => updateRow(index, { totalAmount: e.target.value })} aria-label="Tutar" placeholder="Net tutar ₺" title="Tahsil edilen net tutar (fiyat × adet − indirim)" />
            <select className="ui-input" value={row.paymentMethod} onChange={(e) => updateRow(index, { paymentMethod: e.target.value })} aria-label="Ödeme şekli">
              {Object.entries(SALES_PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select className="ui-input" value={row.channel} onChange={(e) => updateRow(index, { channel: e.target.value })} aria-label="Kanal">
              {Object.entries(SALES_CHANNEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className="ui-input"
              value={row.platformId}
              disabled={!isPlatform}
              required={isPlatform}
              onChange={(e) => updateRow(index, { platformId: e.target.value })}
              aria-label="Platform"
            >
              <option value="">{isPlatform ? "Seçin…" : "—"}</option>
              {activePlatforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>
            <input className="ui-input" type="number" min={0} step="any" value={row.discountAmount} onChange={(e) => updateRow(index, { discountAmount: e.target.value })} aria-label="İndirim" placeholder="İndirim" />
            <button type="button" className="ui-button danger-ghost" onClick={() => setRows((c) => c.filter((_, i) => i !== index))} aria-label="Satırı sil">
              <Trash2 size={17} />
            </button>
          </div>
        );
      })}
      <div className="ui-form-actions">
        <button type="button" className="ui-button secondary small" onClick={() => setRows((c) => [...c, { ...emptyRow }])}>
          <Plus size={15} aria-hidden="true" />
          Satır ekle
        </button>
        <button type="submit" className="ui-button" disabled={isSubmitting}>
          <Check size={17} aria-hidden="true" />
          {isSubmitting ? "Gönderiliyor…" : "Satışları kaydet"}
        </button>
      </div>
      {error && <ErrorMessage message={error} />}
    </form>
  );
}
