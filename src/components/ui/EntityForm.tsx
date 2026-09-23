import type { LucideIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { extractErrorMessage } from "../../api/apiError";
import { ErrorMessage } from "./AsyncState";
import type { FormValues } from "./formValues";
import "./ui.css";


export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "password" | "date" | "time" | "select" | "checkbox" | "textarea";
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  step?: string;
  placeholder?: string;
  /** Verilirse alan yalnızca koşul sağlandığında gösterilir (örn. kart seçimi sadece "Kredi kartı" ödemesinde). */
  visibleWhen?: (values: FormValues) => boolean;
}

interface EntityFormProps {
  fields: FieldDef[];
  initialValues: FormValues;
  onSubmit: (values: FormValues) => Promise<void>;
  submitLabel: string;
  submitIcon?: LucideIcon;
  onCancel?: () => void;
  /** Başarılı gönderimden sonra formu başlangıç değerlerine döndür (oluşturma formları için). */
  resetOnSuccess?: boolean;
  layout?: "inline" | "stacked";
}

/**
 * Alan tanımlarından (FieldDef) üretilen ortak form: gönderme/hata durumunu kendisi yönetir. Tüm
 * modüllerin oluşturma/düzenleme formları bunu kullanır — her sayfada ayrı ayrı state/hata/submit
 * kodu yazılmaz (DRY); sayfalar sadece alanları ve değerlerin isteğe nasıl çevrileceğini tanımlar.
 */
export function EntityForm({
  fields,
  initialValues,
  onSubmit,
  submitLabel,
  submitIcon: SubmitIcon,
  onCancel,
  resetOnSuccess,
  layout = "stacked",
}: EntityFormProps) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setValue(name: string, value: string | boolean) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      if (resetOnSuccess) {
        setValues(initialValues);
      }
    } catch (submitError) {
      setError(extractErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={`ui-form ${layout}`} onSubmit={handleSubmit}>
      {fields
        .filter((field) => !field.visibleWhen || field.visibleWhen(values))
        .map((field) => (
          <FormField key={field.name} field={field} value={values[field.name]} onChange={setValue} />
        ))}
      <div className="ui-form-actions">
        <button type="submit" className="ui-button" disabled={isSubmitting}>
          {SubmitIcon && <SubmitIcon size={17} aria-hidden="true" />}
          {isSubmitting ? "Kaydediliyor…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="ui-button secondary" onClick={onCancel} disabled={isSubmitting}>
            Vazgeç
          </button>
        )}
      </div>
      {error && (
        <div className="ui-form-error">
          <ErrorMessage message={error} />
        </div>
      )}
    </form>
  );
}

interface FormFieldProps {
  field: FieldDef;
  value: string | boolean | undefined;
  onChange: (name: string, value: string | boolean) => void;
}

function FormField({ field, value, onChange }: FormFieldProps) {
  const id = `field-${field.name}`;

  if (field.type === "checkbox") {
    return (
      <label className="ui-checkbox" htmlFor={id}>
        <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(field.name, e.target.checked)} />
        {field.label}
      </label>
    );
  }

  const common = {
    id,
    value: typeof value === "string" ? value : "",
    required: field.required,
    placeholder: field.placeholder,
  };

  return (
    <div className={`ui-field${field.type === "textarea" ? " wide" : ""}`}>
      <label htmlFor={id}>{field.label}</label>
      {field.type === "select" ? (
        <select {...common} onChange={(e) => onChange(field.name, e.target.value)}>
          <option value="">Seçin…</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea {...common} rows={2} onChange={(e) => onChange(field.name, e.target.value)} />
      ) : (
        <input
          {...common}
          type={field.type ?? "text"}
          min={field.min}
          step={field.step ?? (field.type === "number" ? "any" : undefined)}
          onChange={(e) => onChange(field.name, e.target.value)}
        />
      )}
    </div>
  );
}
