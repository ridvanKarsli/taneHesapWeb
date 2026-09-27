import {
  Building2,
  ChartColumn,
  ChefHat,
  LayoutDashboard,
  MoonStar,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { UserRole, type AuthenticatedUser } from "../types/auth";

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
  /**
   * Yalnızca bir işletmeye girmiş süper admin görür (rolü o sırada Admin'dir). İşletme sahibinin değiştirmemesi
   * gereken sistem ayarları için (örn. paket servis platformları ve komisyonları). Backend de aynı kuralı uygular.
   */
  actingSuperAdminOnly?: boolean;
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
    pages: [
      { path: "/isletmeler", label: "İşletmeler", roles: [UserRole.SuperAdmin], description: "Yeni işletme açın ve her işletmeye giriş yapabilecek bir yönetici atayın." },
      { path: "/isletmeler/denetim", label: "Denetim Kayıtları", shortLabel: "Denetim", roles: [UserRole.SuperAdmin], description: "Teknik denetim kaydı (ham eski/yeni değerler). İşletme sahibi Finans → İşlem Geçmişi'ni kullanır." },
    ],
  },
  {
    path: "/gun-sonu",
    label: "Gün Sonu",
    icon: MoonStar,
    tone: "violet",
    description: "Günün Excel'leri ve gelir doğrulama",
    pages: [
      {
        path: "/gun-sonu/satislar",
        label: "Gün Sonu",
        roles: ADMIN,
        description:
          "Günün Kasa, Yemeksepeti ve Uber Excel'lerini yükleyin, ardından kasadaki gerçek nakdi ve POS'taki gerçek kart gelirini girin. Kasaya ve banka hesabına gerçek tutar yazılır, fark raporlanır.",
      },
      {
        path: "/gun-sonu/paket-servis",
        label: "Paket Servis",
        roles: ADMIN,
        actingSuperAdminOnly: true,
        description: "Yemeksepeti, Uber gibi platformlar ve komisyon oranları. Yalnızca süper admin görür ve değiştirir.",
      },
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
      { path: "/finans/kasa", label: "Kasa", roles: ADMIN, description: "Nakit kasası ve banka hesabı satışlarla artar, giderlerle azalır. Transfer, kart borcu ödemesi ve bakiye ayarı buradan." },
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
    description: "Dönem ve aylık raporlar",
    pages: [
      { path: "/raporlar/donem", label: "Dönem", roles: ADMIN, description: "Seçili aralıkta gelir-gider, nakit/kart ve kanal kırılımı." },
      { path: "/raporlar/aylik", label: "Aylık", roles: ADMIN, description: "Ay bitince: tabak başı genel maliyet (tüm giderler ÷ tabak) ve malzeme verimliliği (alınan malzeme başına gelir)." },
    ],
  },
  {
    path: "/calisanlar",
    label: "Çalışanlar",
    icon: Users,
    tone: "slate",
    description: "Çalışan hesapları, saatlik ücret ve cüzdan",
    pages: [{ path: "/calisanlar", label: "Çalışanlar", roles: ADMIN, description: "Çalışan hesapları, saatlik ücret ve cüzdan." }],
  },
];

type Viewer = Pick<AuthenticatedUser, "role" | "isActingAsBusiness">;

/** Sayfa bu kullanıcıya açık mı (rol + süper admine özel sayfalar). Menü, sekmeler ve rota koruması aynı kuralı kullanır. */
export function canSeePage(page: NavPage, viewer: Viewer): boolean {
  return page.roles.includes(viewer.role) && (!page.actingSuperAdminOnly || viewer.isActingAsBusiness);
}

/** Kullanıcının görebildiği gruplar — içindeki sayfalar da süzülmüş olarak. */
export function visibleGroups(viewer: Viewer): NavGroup[] {
  return NAV_GROUPS.map((group) => ({ ...group, pages: group.pages.filter((page) => canSeePage(page, viewer)) })).filter(
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
