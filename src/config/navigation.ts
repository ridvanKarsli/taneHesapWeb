import {
  Bike,
  Boxes,
  Building2,
  Carrot,
  ChartColumn,
  CookingPot,
  LayoutDashboard,
  MoonStar,
  ReceiptText,
  Repeat,
  ShieldCheck,
  Tags,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { UserRole } from "../types/auth";

/** Modül ikonunun zemin tonu (panel kartları ve sayfa başlığında) — bkz. `index.css` `--tone-*`. */
export type NavTone = "saffron" | "green" | "blue" | "rose" | "violet" | "teal" | "amber" | "slate";

export interface NavItem {
  path: string;
  label: string;
  /** Kenar çubuğu, sayfa başlığı ve panel kartlarında kullanılan SVG ikon (lucide). */
  icon: LucideIcon;
  tone: NavTone;
  /** Panel kartında gösterilen kısa açıklama. */
  description: string;
  roles: UserRole[];
}

/**
 * Kenar çubuğu, rota koruması (`routes/AppRoutes.tsx`), sayfa başlıkları (`PageHeader`) ve panel
 * kartları burayı tek kaynak olarak kullanır — yeni bir modül eklemek tek satırlık bir değişikliktir
 * (Open/Closed); sayfalar kendi ikon/başlık/erişim listesini tekrar tanımlamaz (DRY).
 */
export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Panel", icon: LayoutDashboard, tone: "saffron", description: "Genel bakış", roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Employee] },
  { path: "/isletmeler", label: "İşletmeler", icon: Building2, tone: "saffron", description: "İşletme ve yöneticiler", roles: [UserRole.SuperAdmin] },
  { path: "/gun-sonu/satislar", label: "Gün Sonu Satışları", icon: ReceiptText, tone: "saffron", description: "Günün siparişleri", roles: [UserRole.Admin] },
  { path: "/gun-sonu/kapanis", label: "Gün Sonu Kapanışı", icon: MoonStar, tone: "violet", description: "Gerçekleşen ve fire", roles: [UserRole.Admin] },
  { path: "/giderler", label: "Giderler", icon: Wallet, tone: "rose", description: "Gider girişi ve liste", roles: [UserRole.Admin, UserRole.Employee] },
  { path: "/gider-turleri", label: "Gider Türleri", icon: Tags, tone: "amber", description: "Gider kataloğu", roles: [UserRole.Admin] },
  { path: "/urunler", label: "Ürünler / Tabaklar", icon: CookingPot, tone: "saffron", description: "Boy, reçete, maliyet", roles: [UserRole.Admin] },
  { path: "/malzemeler", label: "Malzemeler", icon: Carrot, tone: "green", description: "Fiyat ve stok eşiği", roles: [UserRole.Admin] },
  { path: "/stok-hareketleri", label: "Stok Hareketleri", icon: Boxes, tone: "teal", description: "Sayım ve fire", roles: [UserRole.Admin] },
  { path: "/tedarikciler", label: "Tedarikçiler", icon: Truck, tone: "blue", description: "Alış ve borç takibi", roles: [UserRole.Admin] },
  { path: "/duzenli-giderler", label: "Düzenli Giderler", icon: Repeat, tone: "violet", description: "Kira, fatura, abonelik", roles: [UserRole.Admin] },
  { path: "/platformlar", label: "Paket Servis", icon: Bike, tone: "rose", description: "Platform komisyonları", roles: [UserRole.Admin] },
  { path: "/calisanlar", label: "Çalışanlar", icon: Users, tone: "blue", description: "Kullanıcı hesapları", roles: [UserRole.Admin] },
  { path: "/raporlar", label: "Raporlar", icon: ChartColumn, tone: "green", description: "Gelir-gider analizi", roles: [UserRole.Admin] },
  { path: "/denetim-kayitlari", label: "Denetim Kayıtları", icon: ShieldCheck, tone: "slate", description: "Değişiklik geçmişi", roles: [UserRole.Admin, UserRole.SuperAdmin] },
];

export function findNavItem(path: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.path === path);
}
