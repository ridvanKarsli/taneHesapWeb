/**
 * GET önbelleğinin deposu (bkz. `cachedGet`). Ayrı modüldür ki `httpClient` yazma isteklerinden sonra
 * önbelleği boşaltabilsin ve `cachedGet` ↔ `httpClient` arasında döngüsel bağımlılık oluşmasın.
 */
export interface CacheEntry {
  promise: Promise<unknown>;
  expiresAt: number;
}

export const getCacheEntries = new Map<string, CacheEntry>();

export function clearGetCache(): void {
  getCacheEntries.clear();
}
