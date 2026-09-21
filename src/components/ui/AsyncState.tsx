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

/** Yükleniyor / hata / boş / veri durumlarını her sayfada aynı şekilde gösterir. */
export function AsyncState<T>({ data, error, isLoading, isEmpty, emptyText, children }: AsyncStateProps<T>) {
  if (error) {
    return <p className="ui-error">{error}</p>;
  }
  if (data === null) {
    return <p className="ui-muted">{isLoading ? "Yükleniyor…" : "Veri yok."}</p>;
  }
  if (isEmpty?.(data)) {
    return <p className="ui-muted">{emptyText ?? "Kayıt yok."}</p>;
  }
  return <>{children(data)}</>;
}
