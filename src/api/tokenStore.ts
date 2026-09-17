/**
 * Access/refresh token durumunun tutulduğu tek yer (Single Responsibility). `httpClient` ve
 * `AuthContext` token'lara yalnızca bu modül üzerinden erişir/yazar — böylece saklama stratejisi
 * (bellek/localStorage) değişirse tek değişiklik noktası burasıdır (Open/Closed).
 *
 * Not: Backend şu an refresh token'ı httpOnly cookie olarak değil, düz JSON alanı olarak
 * döndürüyor (proje raporunda kararlaştırılan httpOnly+secure cookie tasarımına göre bilinen bir
 * fark). Bu yüzden burada pragmatik olarak localStorage kullanılıyor; backend ileride cookie'ye
 * taşınırsa bu dosyanın tamamı (ve authApi.refresh çağrısındaki body parametresi) güncellenir.
 */

const REFRESH_TOKEN_STORAGE_KEY = "taneHesap.refreshToken";

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getPersistedRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function persistRefreshToken(refreshToken: string): void {
  try {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  } catch {
    // localStorage kullanılamıyorsa (gizli sekme vb.) sessizce yoksay; oturum sayfa
    // yenilemesinde kaybolur ama uygulama çalışmaya devam eder.
  }
}

export function clearSession(): void {
  accessToken = null;
  try {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    // yoksay
  }
}
