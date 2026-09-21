import { Trash2 } from "lucide-react";
import { useState } from "react";
import { extractErrorMessage } from "../../api/apiError";
import { ErrorMessage } from "./AsyncState";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/**
 * Geri alınamaz işlemler (silme) için onay penceresi. İşlem başarısız olursa (örn. "bu kayıt geçmişte
 * kullanıldığı için silinemez, pasif yapın") backend'in mesajı pencerede gösterilir.
 */
export function ConfirmDialog({ title, message, confirmLabel = "Sil", onConfirm, onClose }: ConfirmDialogProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    setIsWorking(true);
    try {
      await onConfirm();
      onClose();
    } catch (confirmError) {
      setError(extractErrorMessage(confirmError));
      setIsWorking(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="ui-confirm-message">{message}</p>
      {error && <ErrorMessage message={error} />}
      <div className="ui-form-actions ui-confirm-actions">
        <button type="button" className="ui-button secondary" onClick={onClose} disabled={isWorking}>
          Vazgeç
        </button>
        <button type="button" className="ui-button danger" onClick={() => void confirm()} disabled={isWorking || error !== null}>
          <Trash2 size={16} aria-hidden="true" />
          {isWorking ? "Siliniyor…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/** Satır işlemlerindeki küçük "Sil" butonu — tüm sayfalarda aynı görünüm. */
export function DeleteButton({ onClick, label = "Sil" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="ui-button danger-ghost small" onClick={onClick} aria-label={label} title={label}>
      <Trash2 size={15} aria-hidden="true" />
    </button>
  );
}
