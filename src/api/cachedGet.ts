import { httpClient } from "./httpClient";
import { getCacheEntries as entries } from "./getCacheStore";
import { getAccessToken } from "./tokenStore";

/**
 * Sayfalar arasında gezerken aynı tanım listelerini (platformlar, gider türleri, ürünler…) her seferinde
 * sunucudan çekmemek için kısa ömürlü GET önbelleği. Kurallar:
 * - Aynı anda gelen aynı istekler tek ağ çağrısında birleşir (tüm GET'ler için).
 * - Yalnızca `CACHEABLE_PATHS` içindeki yanıtlar `TTL_MS` boyunca saklanır; hareket verisi (gider, kasa, rapor) asla.
 * - Herhangi bir yazma isteği (POST/PUT/DELETE) önbelleği tamamen boşaltır — kendi değişikliğiniz hemen görünür.
 * - Anahtar oturum token'ını içerir: kullanıcı ya da girilen işletme değişince eski veri görünmez.
 */
const TTL_MS = 60_000;

const CACHEABLE_PATHS = new Set([
  "/api/platforms",
  "/api/expense-types",
  "/api/employees",
  "/api/ingredients",
  "/api/dishes",
  "/api/treasury/cards",
  "/api/activity/users",
  "/api/activity/kinds",
]);

export function cachedGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? new URLSearchParams(params).toString() : "";
  const key = `${getAccessToken() ?? ""} ${path}?${query}`;
  const now = Date.now();
  const hit = entries.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.promise as Promise<T>;
  }

  const keep = !query && CACHEABLE_PATHS.has(path);
  const promise = httpClient.get<T>(path, { params }).then((response) => response.data);
  // Önbelleğe alınmayanlar yalnızca istek sürerken tutulur (eşzamanlı çağrıları birleştirmek için).
  entries.set(key, { promise, expiresAt: keep ? now + TTL_MS : Number.POSITIVE_INFINITY });
  const forget = () => {
    if (entries.get(key)?.promise === promise) {
      entries.delete(key);
    }
  };
  promise.then(() => (keep ? undefined : forget()), forget);
  return promise;
}
