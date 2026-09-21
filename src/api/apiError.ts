/**
 * Backend hata yanıtlarını kullanıcıya gösterilebilir tek bir mesaja çevirir. İki biçim desteklenir:
 * - `ExceptionHandlingMiddleware` → `{ error: "..." }` (404/409/400/500 iş kuralı hataları),
 * - ASP.NET model doğrulaması → ProblemDetails `{ title, errors: { alan: ["..."] } }`.
 * Tüm sayfalar hata metnini buradan alır (tek sorumluluk, tek değişiklik noktası).
 */
interface ErrorBody {
  error?: unknown;
  title?: unknown;
  errors?: Record<string, unknown>;
}

const FALLBACK_MESSAGE = "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.";

function readBody(error: unknown): ErrorBody | undefined {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return undefined;
  }
  const data = (error as { response?: { data?: unknown } }).response?.data;
  return typeof data === "object" && data !== null ? (data as ErrorBody) : undefined;
}

function isNetworkError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ERR_NETWORK";
}

export function extractErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return "Sunucuya ulaşılamıyor — backend çalışıyor mu?";
  }

  const body = readBody(error);
  if (typeof body?.error === "string") {
    return body.error;
  }

  if (body?.errors) {
    const messages = Object.values(body.errors).flat().filter((m): m is string => typeof m === "string");
    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return typeof body?.title === "string" ? body.title : FALLBACK_MESSAGE;
}
