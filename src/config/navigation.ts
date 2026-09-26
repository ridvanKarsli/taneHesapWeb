import {
  Building2,
  ChartColumn,
  ChefHat,
  LayoutDashboard,
  MoonStar,
  Settings2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { UserRole } from "../types/auth";

/** Modül ikonunun zemin tonu (panel kartları ve sayfa başlığında) — bkz. `index.css` `--tone-*`. */
export type NavTone = "saffron" | "green" | "blue" | "rose" | "violet" | "teal" | "amber" | "slate";

/** Bir grup içindeki sekme (alt sayfa). */
export interface NavPage {
  path: string;
  label: string;
  roles: UserRole[];
  /** Sayfa girişinde gösterilen kısa açıklama. */
  description?: string;
  /** Tek sayfalık grupta mobil alt sekme için kısa ad. */
  shortLabel?: string;
}

/**
 * Kenar çubuğundaki bir menü öğesi. Birden fazla görünür sayfası varsa sayfa üstünde sekmeler çıkar;
 * tek sayfası varsa kenar çubuğu doğrudan o sayfanın adıyla ve adresiyle bağlanır.
 */
export interface NavGroup {
  path: string;
  label: string;
  /** Mobil alt sekme çubuğu için kısa ad (verilmezse label). */
  shortLabel?: string;
  icon: LucideIcon;
  tone: NavTone;
  description: string;
  pages: NavPage[];
}

const ALL_ROLES = [UserRole.SuperAdmin, UserRole.Admin, UserRole.Employee];
const ADMIN = [UserRole.Admin];

/**
 * Menü, rota tablosu, sekmeler, sayfa başlıkları ve panel kartları için tek kaynak. Menü bilinçli olarak
 * az sayıda gruptan oluşur; işler grup içinde sekmelere ayrılır (Rıdvan'ın "daha az sayfa, sayfa içinde
 * kategori" isteği). Yeni bir sayfa eklemek = ilgili gruba bir satır + `PAGE_COMPONENTS`'a bir eşleme.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    path: "/",
    label: "Panel",
    icon: LayoutDashboard,
    tone: "saffron",
    description: "Genel bakış",
    pages: [{ path: "/", label: "Panel", roles: ALL_ROLES }],
  },
  {
    path: "/isletmeler",
    label: "İşletmeler",
    icon: Building2,
    tone: "saffron",
    description: "İşletmeler ve yöneticileri",
    pages: [{ path: "/isletmeler", label: "İşletmeler", roles: [UserRole.SuperAdmin], description: "Yeni işletme açın ve her işletmeye giriş yapabilecek bir yönetici atayın." }],
  },
  {
    path: "/gun-sonu",
    label: "Gün Sonu",
    icon: MoonStar,
    tone: "violet",
    description: "Satışlar ve kapanış",
    pages: [
      { path: "/gun-sonu/satislar", label: "Satışlar", roles: ADMIN, description: "Günün siparişlerini Excel ile yükleyin veya tek tek girin." },
      { path: "/gun-sonu/kapanis", label: "Kapanış", roles: ADMIN, description: "Gerçekleşen geliri ve sayılan malzeme tüketimini girin; fire raporu üretilir." },
    ],
  },
  {
    path: "/finans",
    label: "Finans",
    icon: Wallet,
    tone: "rose",
    description: "Giderler, kasa, kartlar, işlem geçmişi",
    pages: [
      { path: "/finans/giderler", label: "Giderler", roles: [UserRole.Admin, UserRole.Employee] },
      { path: "/finans/cuzdanim", label: "Cüzdanım", roles: [UserRole.Employee], description: "Çalıştığınız saatlere göre hak edişiniz, size yapılan ödemeler ve kalan bakiyeniz." },
      { path: "/finans/kasa", label: "Kasa", roles: ADMIN, description: "Nakit ve kart kasası satışlarla artar, giderlerle azalır. Transfer, kart borcu ödemesi ve düzeltme buradan." },
      { path: "/finans/kartlarim", label: "Kartlarım", roles: ADMIN, description: "Kredi kartları ve limitleri. Kartla ödenen giderler limitten düşer; kart borcu Kasa'dan ödenince limit geri açılır." },
      { path: "/finans/duzenli-giderler", label: "Düzenli Giderler", roles: ADMIN, description: "Üstte ödenmemiş dönemler: nereden ödeneceğini seçip “Öde” deyin, listeden çıkar. Altta tanımlar (kira, fatura; “3 ayda bir” gibi serbest periyot)." },
      { path: "/finans/islem-gecmisi", label: "İşlem Geçmişi", roles: ADMIN, description: "Kim, ne zaman, hangi gideri/satışı/ödemeyi ekledi, değiştirdi veya sildi." },
    ],
  },
  {
    path: "/mutfak",
    label: "Mutfak ve Stok",
    shortLabel: "Mutfak",
    icon: ChefHat,
    tone: "green",
    description: "Ürünler, malzemeler, stok, tedarikçiler",
    pages: [
      { path: "/mutfak/urunler", label: "Ürünler", roles: ADMIN, description: "Ürün, tabak boyu, reçete ve otomatik maliyet." },
      { path: "/mutfak/malzemeler", label: "Malzemeler", roles: ADMIN, description: "Birim fiyat, minimum stok eşiği ve güncel stok." },
      { path: "/mutfak/stok", label: "Stok Hareketleri", roles: ADMIN, description: "Satıştan otomatik düşüm, sayım düzeltmesi ve fire." },
      { path: "/mutfak/tedarikciler", label: "Tedarikçiler", roles: ADMIN, description: "Alışlar stoğu artırır; ödemeler kasadan düşer ve gider olarak işlenir." },
    ],
  },
  {
    path: "/raporlar",
    label: "Raporlar",
    icon: ChartColumn,
    tone: "blue",
    description: "Dönem, aylık ve fire raporları",
    pages: [
      { path: "/raporlar/donem", label: "Dönem", roles: ADMIN, description: "Seçili aralıkta gelir-gider, nakit/kart ve kanal kırılımı." },
      { path: "/raporlar/aylik", label: "Aylık", roles: ADMIN, description: "Tabak başı genel maliyet ve malzeme verimliliği; ay bitince otomatik bildirilir." },
      { path: "/raporlar/fire", label: "Fire / Kayıp", roles: ADMIN, description: "Gün sonu kapanışlarından üretilen günlük fire ve gelir farkı özetleri." },
    ],
  },
  {
    path: "/tanimlar",
    label: "Tanımlar",
    icon: Settings2,
    tone: "slate",
    description: "Gider türleri, platformlar, çalışanlar",
    pages: [
      { path: "/tanimlar/gider-turleri", label: "Gider Türleri", roles: ADMIN, description: "Gider girişinde kullanılan katalog: ad, birim, kategori." },
      { path: "/tanimlar/platformlar", label: "Paket Servis", roles: ADMIN, description: "Platform komisyon oranları; komisyon satıştan otomatik gidere dönüşür." },
      { path: "/tanimlar/calisanlar", label: "Çalışanlar", roles: ADMIN, description: "Çalışan hesapları, saatlik ücret ve cüzdan." },
      { path: "/tanimlar/denetim", label: "Denetim Kayıtları", shortLabel: "Denetim", roles: [UserRole.SuperAdmin], description: "Teknik denetim kaydı (ham eski/yeni değerler) — yalnızca süper yönetici. İşletme sahibi Finans → İşlem Geçmişi'ni kullanır." },
    ],
  },
];

/** Bir rolün görebildiği gruplar — içindeki sayfalar da role göre süzülmüş olarak. */
export function visibleGroups(role: UserRole): NavGroup[] {
  return NAV_GROUPS.map((group) => ({ ...group, pages: group.pages.filter((page) => page.roles.includes(role)) })).filter(
    (group) => group.pages.length > 0,
  );
}

export function findNavPage(pathname: string): { group: NavGroup; page: NavPage } | undefined {
  for (const group of NAV_GROUPS) {
    const page = group.pages.find((p) => p.path === pathname);
    if (page) {
      return { group, page };
    }
  }
  return undefined;
}
