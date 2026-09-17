import { UserRole } from "../types/auth";

export interface NavItem {
  path: string;
  label: string;
  roles: UserRole[];
}

/**
 * Kenar çubuğu ve rota koruması (bkz. `routes/AppRoutes.tsx`) burayı tek kaynak olarak kullanır —
 * yeni bir modül eklemek tek satırlık bir değişikliktir (Open/Closed), sayfa bileşenleri kendi
 * erişim listesini tekrar tanımlamaz (DRY).
 */
export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Panel", roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Employee] },
  { path: "/isletmeler", label: "İşletmeler", roles: [UserRole.SuperAdmin] },
  { path: "/gun-sonu/satislar", label: "Gün Sonu Satışları", roles: [UserRole.Admin] },
  { path: "/gun-sonu/kapanis", label: "Gün Sonu Kapanışı", roles: [UserRole.Admin] },
  { path: "/giderler", label: "Giderler", roles: [UserRole.Admin, UserRole.Employee] },
  { path: "/gider-turleri", label: "Gider Türleri", roles: [UserRole.Admin] },
  { path: "/urunler", label: "Ürünler / Tabaklar", roles: [UserRole.Admin] },
  { path: "/malzemeler", label: "Malzemeler", roles: [UserRole.Admin] },
  { path: "/stok-hareketleri", label: "Stok Hareketleri", roles: [UserRole.Admin] },
  { path: "/tedarikciler", label: "Tedarikçiler", roles: [UserRole.Admin] },
  { path: "/duzenli-giderler", label: "Düzenli Giderler", roles: [UserRole.Admin] },
  { path: "/platformlar", label: "Paket Servis Platformları", roles: [UserRole.Admin] },
  { path: "/calisanlar", label: "Çalışanlar", roles: [UserRole.Admin] },
  { path: "/raporlar", label: "Raporlar", roles: [UserRole.Admin] },
  { path: "/denetim-kayitlari", label: "Denetim Kayıtları", roles: [UserRole.Admin] },
];
