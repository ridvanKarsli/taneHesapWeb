import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { extractErrorMessage } from "../../api/apiError";
import { ErrorMessage } from "../../components/ui/AsyncState";
import type { DishSizeDto, RecipeItemRequest } from "../../types/dish";
import type { IngredientDto } from "../../types/ingredient";

export interface DishSizeFormValues {
  name: string;
  salePrice: number;
  isActive: boolean;
  recipeItems: RecipeItemRequest[];
}

interface DishSizeFormProps {
  ingredients: IngredientDto[];
  initial?: DishSizeDto;
  onSubmit: (values: DishSizeFormValues) => Promise<void>;
  onCancel: () => void;
}

interface RecipeRow {
  ingredientId: string;
  quantity: string;
}

/**
 * Tabak boyu + reçete formu. Reçete dinamik satırlardan oluştuğu için genel `EntityForm` yerine
 * ayrı bir bileşen. Miktar malzemenin kendi biriminde girilir (malzeme kg ise 150 g = 0,15) — backend
 * maliyeti `miktar × güncel birim fiyat` olarak hesaplar.
 */
export function DishSizeForm({ ingredients, initial, onSubmit, onCancel }: DishSizeFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [salePrice, setSalePrice] = useState(initial ? String(initial.salePrice) : "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [rows, setRows] = useState<RecipeRow[]>(
    initial?.recipeItems.map((item) => ({ ingredientId: item.ingredientId, quantity: String(item.quantity) })) ?? [
      { ingredientId: "", quantity: "" },
    ],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitOf = (ingredientId: string) => ingredients.find((i) => i.id === ingredientId)?.unit ?? "";

  function updateRow(index: number, patch: Partial<RecipeRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const recipeItems = rows
      .filter((row) => row.ingredientId && row.quantity)
      .map((row) => ({ ingredientId: row.ingredientId, quantity: Number(row.quantity.replace(",", ".")) }));

    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), salePrice: Number(salePrice.replace(",", ".")), isActive, recipeItems });
    } catch (submitError) {
      setError(extractErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="ui-form stacked" onSubmit={handleSubmit}>
      <div className="ui-field">
        <label htmlFor="size-name">Boy adı</label>
        <input id="size-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Küçük / Orta / Büyük" />
      </div>
      <div className="ui-field">
        <label htmlFor="size-price">Satış fiyatı (₺)</label>
        <input id="size-price" type="number" step="any" min={0} value={salePrice} onChange={(e) => setSalePrice(e.target.value)} required />
      </div>
      {initial && (
        <label className="ui-checkbox">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Aktif
        </label>
      )}

      <div>
        <p className="ui-subheading">Reçete (malzemenin biriminde — kg ise 150 g = 0,15)</p>
        {rows.map((row, index) => (
          <div className="recipe-row" key={index}>
            <select
              className="ui-input"
              value={row.ingredientId}
              onChange={(e) => updateRow(index, { ingredientId: e.target.value })}
              aria-label="Malzeme"
            >
              <option value="">Malzeme seçin…</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
            </select>
            <input
              className="ui-input"
              type="number"
              step="any"
              min={0}
              value={row.quantity}
              onChange={(e) => updateRow(index, { quantity: e.target.value })}
              placeholder="Miktar"
              aria-label="Miktar"
            />
            <span className="recipe-unit">{unitOf(row.ingredientId)}</span>
            <button
              type="button"
              className="ui-button danger-ghost"
              onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
              aria-label="Satırı sil"
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
        <button type="button" className="ui-button secondary small" onClick={() => setRows((c) => [...c, { ingredientId: "", quantity: "" }])}>
          <Plus size={15} aria-hidden="true" />
          Malzeme ekle
        </button>
      </div>

      <div className="ui-form-actions">
        <button type="submit" className="ui-button" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <button type="button" className="ui-button secondary" onClick={onCancel} disabled={isSubmitting}>
          Vazgeç
        </button>
      </div>
      {error && <ErrorMessage message={error} />}
    </form>
  );
}
