import { useEffect, type ReactNode } from "react";
import "./ui.css";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Düzenleme formları için basit diyalog (Esc veya arka plana tıklayınca kapanır). */
export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="ui-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="ui-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ui-modal-header">
          <h2>{title}</h2>
          <button type="button" className="ui-button ghost" onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
