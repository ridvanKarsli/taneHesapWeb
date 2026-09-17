import { UserRole } from "../types/auth";

export interface NavItem {
  path: string;
  label: string;
  /** Kenar çubuğunda ve ComingSoonPage'de kullanılan tek karakterlik emoji — bkz. proje raporu tasarım notu. */
  icon: string;
  roles: UserRole[];
}

/**
 * Kenar çubuğu ve rota koruması (bkz. `routes/AppRoutes.tsx`) burayı tek kaynak olarak kullanır —
 * yeni bir modül eklemek tek satırlık bir değişikliktir (Open/Closed), sayfa bileşenleri kendi
 * erişim listesini tekrar tanımlamaz (DRY).
 */
export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Panel", icon: "🏠", roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Employee] },
  { path: "/isletmeler", label: "İşletmeler", icon: "🏢", roles: [UserRole.SuperAdmin] },
  { path: "/gun-sonu/satislar", label: "Gün Sonu Satışları", icon: "🧾", roles: [UserRole.Admin] },
  { path: "/gun-sonu/kapanis", label: "Gün Sonu Kapanışı", icon: "🌙", roles: [UserRole.Admin] },
  { path: "/giderler", label: "Giderler", icon: "💸", roles: [UserRole.Admin, UserRole.Employee] },
  { path: "/gider-turleri", label: "Gider Türleri", icon: "🗂️", roles: [UserRole.Admin] },
  { path: "/urunler", label: "Ürünler / Tabaklar", icon: "🍚", roles: [UserRole.Admin] },
  { path: "/malzemeler", label: "Malzemeler", icon: "🥕", roles: [UserRole.Admin] },
  { path: "/stok-hareketleri", label: "Stok Hareketleri", icon: "📦", roles: [UserRole.Admin] },
  { path: "/tedarikciler", label: "Tedarikçiler", icon: "🚚", roles: [UserRole.Admin] },
  { path: "/duzenli-giderler", label: "Düzenli Giderler", icon: "🔁", roles: [UserRole.Admin] },
  { path: "/platformlar", label: "Paket Servis Platformları", icon: "🛵", roles: [UserRole.Admin] },
  { path: "/calisanlar", label: "Çalışanlar", icon: "🧑‍🍳", roles: [UserRole.Admin] },
  { path: "/raporlar", label: "Raporlar", icon: "📊", roles: [UserRole.Admin] },
  { path: "/denetim-kayitlari", label: "Denetim Kayıtları", icon: "🛡️", roles: [UserRole.Admin] },
];
