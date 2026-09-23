import { treasuryApi } from "../api/moduleApis";
import { useAsyncData } from "./useAsyncData";

/** Ödeme formlarında "hangi kart" seçimi için işletmenin kartları (ADMIN ve EMPLOYEE erişebilir). */
export function usePaymentCards() {
  const cards = useAsyncData(treasuryApi.getAll);
  return { cards: cards.data ?? [], reload: cards.reload };
}
