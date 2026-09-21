import { CircleAlert, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import "./ui.css";

interface AsyncStateProps<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isEmpty?: (data: T) => boolean;
  emptyText?: string;
  children: (data: T) => ReactNode;
}

/** Yükleniyor (iskelet) / hata / boş / veri durumlarını her sayfada aynı şekilde gösterir. */
export function AsyncState<T>({ data, error, isLoading, isEmpty, emptyText, children }: AsyncStateProps<T>) {
  if (error) {
    return <ErrorMessage message={error} />;
  }
  if (data === null) {
    return isLoading ? (
      <div className="ui-skeleton" aria-label="Yükleniyor">
        <span />
        <span />
        <span />
      </div>
    ) : (
      <EmptyState text="Veri yok." />
    );
  }
  if (isEmpty?.(data)) {
    return <EmptyState text={emptyText ?? "Kayıt yok."} />;
  }
  return <>{children(data)}</>;
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="ui-empty">
      <span className="ui-empty-icon" aria-hidden="true">
        <Inbox size={24} />
      </span>
      {text}
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="ui-error" role="alert">
      <CircleAlert size={17} aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
