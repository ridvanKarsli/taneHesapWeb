import type { CellValue } from "./salesExcel";

/**
 * Yüklenen .xlsx'in ilk sayfasını hücre matrisi olarak okur. SheetJS kullanılır: platform dışa aktarımları
 * standart dışı olabiliyor (Trendyol Go'nun zip kayıtları, Yemeksepeti'nin bozuk stil dosyası) ve
 * SheetJS bunları tolere eder. Tarih hücreleri Excel seri sayısı olarak bırakılır (`cellDates: false`);
 * saat dilimi karışmasın diye seri → tarih çevrimi `excelSerialToDateTime` ile elle yapılır.
 */
export async function readFirstSheet(file: File): Promise<CellValue[][]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
  const first = workbook.Sheets[workbook.SheetNames[0]];
  if (!first) {
    return [];
  }
  return XLSX.utils.sheet_to_json<CellValue[]>(first, { header: 1, raw: true, defval: null, blankrows: false });
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Excel seri tarihi (1899-12-30'dan gün; kesir = günün saati) → { date: yyyy-MM-dd, time: HH:mm:ss }. */
export function excelSerialToDateTime(serial: number): { date: string; time: string } {
  const days = Math.floor(serial);
  const secondsOfDay = Math.round((serial - days) * 86400);
  const utc = new Date(Date.UTC(1899, 11, 30) + days * 86400000);
  const hours = Math.floor(secondsOfDay / 3600);
  const minutes = Math.floor((secondsOfDay % 3600) / 60);
  const seconds = secondsOfDay % 60;
  return {
    date: `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`,
    time: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
  };
}

/**
 * Hücredeki tarih-saati çözer: Excel seri sayısı, "yyyy-MM-dd HH:mm[:ss]" (Yemeksepeti), "dd.MM.yyyy HH:mm"
 * ya da ISO metin. Çözülemezse null.
 */
export function cellToDateTime(value: CellValue): { date: string; time: string | null } | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 20000) {
    return excelSerialToDateTime(value);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      date: `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`,
      time: `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}`,
    };
  }
  const text = String(value ?? "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(text);
  if (iso) {
    return { date: `${iso[1]}-${iso[2]}-${iso[3]}`, time: iso[4] ? `${pad(Number(iso[4]))}:${iso[5]}:${iso[6] ?? "00"}` : null };
  }
  const tr = /^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(text);
  if (tr) {
    return { date: `${tr[3]}-${pad(Number(tr[2]))}-${pad(Number(tr[1]))}`, time: tr[4] ? `${pad(Number(tr[4]))}:${tr[5]}:${tr[6] ?? "00"}` : null };
  }
  return null;
}
