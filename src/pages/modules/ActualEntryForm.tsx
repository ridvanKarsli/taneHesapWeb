import { MoonStar, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { extractErrorMessage } from "../../api/apiError";
import { ErrorMessage } from "../../components/ui/AsyncState";
import { formatNumber } from "../../lib/format";
import type { SubmitDailyActualEntryRequest } from "../../types/dailyClosing";
import type { IngredientDto } from "../../types/ingredient";

export interface ConsumptionDraft {
  ingredientId: string;
  expectedQuantity: number | null;
  actualQuantity: string;
}

interface ActualEntryFormProps {
  date: string;
  ingredients: IngredientDto[];
  initialRevenue: string;
  initialNote: string;
  initialRows: ConsumptionDraft[];
  onSubmit: (request: SubmitDailyActualEntryRequest) => Promise<void>;
}

/**
 * ADMIN'in gün sonu gerçekleşen gelir ve malzeme tüketimi girişi (bkz. proje raporu 3.10 adım 2).
 * Satırlar reçeteye göre beklenen tüketimle ön doldurulur; ADMIN sayıma göre düzeltir.
 */
export function ActualEntryForm({ date, ingredients, initialRevenue, initialNote, initialRows, onSubmit }: ActualEntryFormProps) {
  const [revenue, setRevenue] = useState(initialRevenue);
  const [note, setNote] = useState(initialNote);
  const [rows, setRows] = useState<ConsumptionDraft[]>(initialRows);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingredientById = new Map(ingredients.map((i) => [i.id, i]));
  const usedIds = new Set(rows.map((row) => row.ingredientId));

  function updateRow(index: number, patch: Partial<ConsumptionDraft>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        entryDate: date,
        actualRevenue: Number(revenue.replace(",", ".")),
        note: note.trim() || null,
        consumptionItems: rows
          .filter((row) => row.ingredientId && row.actualQuantity !== "")
          .map((row) => ({ ingredientId: row.ingredientId, actualQuantityUsed: Number(row.actualQuantity.replace(",", ".")) })),
      });
    } catch (submitError) {
      setError(extractErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="ui-form stacked" onSubmit={handleSubmit}>
      <div className="ui-form inline">
        <div className="ui-field">
          <label htmlFor="actual-revenue">Gerçekleşen gelir (₺)</label>
          <input id="actual-revenue" type="number" step="any" min={0} value={revenue} onChange={(e) => setRevenue(e.target.value)} required />
        </div>
        <div className="ui-field wide">
          <label htmlFor="actual-note">Not</label>
          <input id="actual-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="örn. kasa sayımı akşam 23:00" />
        </div>
      </div>

      <div>
        <p className="ui-subheading">Gerçek malzeme tüketimi</p>
        {rows.map((row, index) => {
          const ingredient = ingredientById.get(row.ingredientId);
          return (
            <div className="consumption-row" key={index}>
              {row.expectedQuantity !== null ? (
                <strong>{ingredient?.name ?? "—"}</strong>
              ) : (
                <select className="ui-input" value={row.ingredientId} onChange={(e) => updateRow(index, { ingredientId: e.target.value })} aria-label="Malzeme">
                  <option value="">Malzeme seçin…</option>
                  {ingredients
                    .filter((i) => i.id === row.ingredientId || !usedIds.has(i.id))
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                </select>
              )}
              <span className="ui-muted">
                {row.expectedQuantity !== null ? `Beklenen: ${formatNumber(row.expectedQuantity)} ${ingredient?.unit ?? ""}` : "Reçete dışı"}
              </span>
              <input
                className="ui-input"
                type="number"
                step="any"
                min={0}
                value={row.actualQuantity}
                onChange={(e) => updateRow(index, { actualQuantity: e.target.value })}
                placeholder={`Gerçek (${ingredient?.unit ?? "birim"})`}
                aria-label="Gerçek tüketim"
              />
              <button type="button" className="ui-button danger-ghost" onClick={() => setRows((c) => c.filter((_, i) => i !== index))} aria-label="Satırı sil">
                <Trash2 size={17} />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="ui-button secondary small"
          onClick={() => setRows((c) => [...c, { ingredientId: "", expectedQuantity: null, actualQuantity: "" }])}
        >
          <Plus size={15} aria-hidden="true" />
          Malzeme ekle
        </button>
      </div>

      <div className="ui-form-actions">
        <button type="submit" className="ui-button" disabled={isSubmitting}>
          <MoonStar size={17} aria-hidden="true" />
          {isSubmitting ? "Kaydediliyor…" : "Gün sonunu kapat ve raporla"}
        </button>
      </div>
      {error && <ErrorMessage message={error} />}
    </form>
  );
}
