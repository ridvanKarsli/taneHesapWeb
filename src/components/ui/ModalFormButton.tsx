import { Plus, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { EntityForm, type FieldDef } from "./EntityForm";
import type { FormValues } from "./formValues";
import { Modal } from "./Modal";

interface ModalFormButtonProps {
  /** Düğme metni (örn. "Yeni gider"). */
  label: string;
  /** Pencere başlığı; verilmezse düğme metni kullanılır. */
  title?: string;
  icon?: LucideIcon;
  buttonClassName?: string;
  fields: FieldDef[];
  initialValues: FormValues;
  submitLabel?: string;
  /** Formun üstünde gösterilecek kısa açıklama. */
  intro?: ReactNode;
  disabled?: boolean;
  onSubmit: (values: FormValues) => Promise<void>;
}

/**
 * "Düğme → pencerede form" deseni. Oluşturma formları sayfada sürekli açık durmak yerine bir düğmeye
 * bağlanır; sayfalar liste odaklı ve derli toplu kalır. Aç/kapa durumu burada, sayfa kodu taşımaz.
 */
export function ModalFormButton({
  label,
  title,
  icon: Icon = Plus,
  buttonClassName = "ui-button",
  fields,
  initialValues,
  submitLabel = "Kaydet",
  intro,
  disabled,
  onSubmit,
}: ModalFormButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" className={buttonClassName} onClick={() => setIsOpen(true)} disabled={disabled}>
        <Icon size={16} aria-hidden="true" />
        {label}
      </button>
      {isOpen && (
        <Modal title={title ?? label} onClose={() => setIsOpen(false)}>
          {intro}
          <EntityForm
            fields={fields}
            initialValues={initialValues}
            submitLabel={submitLabel}
            onCancel={() => setIsOpen(false)}
            onSubmit={async (values) => {
              await onSubmit(values);
              setIsOpen(false);
            }}
          />
        </Modal>
      )}
    </>
  );
}
