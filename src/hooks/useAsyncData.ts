import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { extractErrorMessage } from "../api/apiError";

export interface AsyncData<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  reload: () => Promise<void>;
  setData: Dispatch<SetStateAction<T | null>>;
}

/**
 * Bir sayfanın veri yükleme/hata/yeniden yükleme döngüsünü tek yerde toplar — her sayfada aynı
 * `useState + useEffect + try/catch` bloğunu tekrar yazmamak için (DRY). `key` değiştiğinde (örn.
 * seçilen tarih/filtre) veri yeniden yüklenir; geç gelen eski yanıtlar yok sayılır.
 */
export function useAsyncData<T>(loader: () => Promise<T>, key = ""): AsyncData<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loaderRef = useRef(loader);
  const latestRequestRef = useRef(0);

  useEffect(() => {
    loaderRef.current = loader;
  });

  const reload = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    setIsLoading(true);
    try {
      const result = await loaderRef.current();
      if (requestId === latestRequestRef.current) {
        setData(result);
        setError(null);
      }
    } catch (loadError) {
      if (requestId === latestRequestRef.current) {
        setError(extractErrorMessage(loadError));
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, key]);

  return { data, error, isLoading, reload, setData };
}
