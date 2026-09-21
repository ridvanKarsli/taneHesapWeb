# taneHesap — Frontend

React (TypeScript) + Vite. Backend'i (`TaneHesap.API`) tüketen ayrı bir SPA; kapsam ve karar geçmişi
için `../proje-raporu.md` dosyasına bakın.

## Katmanlar

```
src/
  api/            httpClient (axios + JWT interceptor + otomatik refresh), authApi, token saklama.
  auth/           AuthContext/useAuth (tek kimlik doğrulama kaynağı), RequireAuth (rota koruması).
  types/          Backend DTO'larıyla birebir eşleşen TS tipleri (auth, notification).
  config/         navigation.ts — kenar çubuğu + rota koruması için TEK KAYNAK modül/rol/ikon listesi.
  layout/         AppLayout — kenar çubuğu, üst bar, bildirim zili, çıkış.
  routes/         AppRoutes — navigation.ts'ten üretilen rota tablosu.
  realtime/       useNotificationsHub — SignalR (/hubs/notifications) bağlantısı.
  api/moduleApis  Tüm işletme modüllerinin backend istemcileri; basit CRUD'lar `crudApi.ts` fabrikasıyla.
  hooks/          useAsyncData — yükleme/hata/yeniden yükleme döngüsü (her sayfada tekrar yazılmaz).
  lib/            format.ts — para/sayı/tarih biçimlendirme (tr-TR) ve tarih yardımcıları.
  components/     ui/ (PageHeader, Section, DataTable, EntityForm, Modal, StatTile…), crud/CrudPage,
                  NotificationsBell (kalıcı bildirimler + SignalR + okundu işaretleme).
  pages/          auth/, dashboard/ (panel + ADMIN uyarıları), businesses/ (SUPER_ADMIN),
                  modules/ (tüm işletme modülleri), common/ (ComingSoonPage, NotFoundPage).
  pwa/            useInstallPrompt + InstallPromptBanner — "ana ekrana ekle" istemi (bkz. aşağı).
```

Bağımlılık yönü: `pages`/`layout` → `auth`/`api`/`config` → hiçbiri React Router veya sayfalara
geri bağımlı değil. Yeni bir modül eklemek için:

1. `config/navigation.ts`'e path/label/ikon/roller eklenir (tek kaynak).
2. Sayfa bileşeni yazılıp `routes/AppRoutes.tsx`'teki `PAGE_COMPONENTS` eşlemesine tek satır eklenir
   (eşlemesi olmayan path `ComingSoonPage` ile açılır). "Liste + oluştur + düzenle" modülleri için
   `components/crud/CrudPage` kullanılır — sayfa sadece kolonları, form alanlarını ve form
   değerlerinin backend isteğine dönüşümünü tanımlar.

## Tasarım sistemi ("tatlı ve kurumsal")

Tüm renk/radius/gölge değerleri `src/index.css`'te CSS custom property olarak tek noktada
tanımlı (`--color-*`, `--radius-*`, `--shadow-*`); bileşenler bu token'lara `var(--...)` ile
başvurur, doğrudan hex/px değeri yazmaz. Bu sayede marka rengi veya köşe yuvarlaklığı gibi bir
karar değişirse tek değişiklik noktası `index.css` olur (SOLID: Open/Closed — bileşenleri
değiştirmeden temayı genişletmek/değiştirmek mümkün).

- Palet: sıcak safran/pilav tonları (Meydan Pilavcısı temasına uygun), kurumsal his için
  ölçülü kontrast ve tutarlı köşe yuvarlaklığı/gölge ölçeği.
- Yazı tipi: Google Fonts üzerinden "Plus Jakarta Sans" (bkz. `index.html`).
- Her modülün kenar çubuğunda ve panel kısayol kartlarında aynı emoji ikon kullanılır
  (`config/navigation.ts` → `icon` alanı, tek kaynak — `AppLayout` ve `DashboardPage` aynı
  listeyi okur).

## PWA — "Ana ekrana ekle"

`vite-plugin-pwa` ile manifest + service worker otomatik üretiliyor (elle yazılmış bir service
worker yerine; bakım yükü ve hata payı daha düşük). Uygulama artık gerçek anlamda yüklenebilir bir
PWA: Android/Chrome/Edge'de `beforeinstallprompt` olayını yakalayıp kullanıcıya "ana ekrana ekle"
bandı gösteriyoruz (`src/pwa/InstallPromptBanner.tsx` + `useInstallPrompt.ts`); iOS Safari bu olayı
desteklemediği için orada Paylaş → "Ana Ekrana Ekle" adımlarını anlatan bir talimat metni gösterilir.
Banner, kullanıcı kapattığında veya uygulama zaten yüklüyken (`display-mode: standalone` / iOS
`navigator.standalone`) tekrar gösterilmez (`localStorage` bayrağı).

İkon seti `frontend/brand/*.svg` kaynak vektörlerinden (`rsvg-convert` ile) üretildi:
`public/pwa-192.png`, `pwa-512.png` (purpose: any) ve `pwa-maskable-512.png` (purpose: maskable,
güvenli alan içine sığdırılmış tasarım) + `apple-touch-icon.png`. Marka rengi/ikonu değişirse tek
değişiklik noktası `brand/` klasöründeki SVG'lerdir; PNG'ler oradan yeniden üretilir.

## Kimlik doğrulama notu

Backend `LoginResponse` içinde refresh token'ı düz bir JSON alanı olarak döndürüyor (henüz
proje raporunda kararlaştırılan httpOnly+secure cookie'ye taşınmadı — bkz. `api/tokenStore.ts`
içindeki not). Bu yüzden frontend pragmatik olarak `localStorage` kullanıyor; backend ileride
cookie'ye geçerse değişiklik sadece `api/tokenStore.ts` ve `api/httpClient.ts`'te olur.

Tüm roller sadece kullanıcı adı/şifre ile giriş yapar (authenticator/2FA kaldırıldı — bkz. proje
raporu bölüm 2, 7).

## Kurulum (yerelde)

```bash
npm install
cp .env.example .env   # VITE_API_BASE_URL'i backend'inizin adresine göre düzenleyin
npm run dev
```

- `npm run build` — tip kontrolü (`tsc -b`) + üretim derlemesi + PWA manifest/service worker üretimi.
- `npm run lint` — oxlint.

## Durum

Tüm backend API'leri arayüze bağlı: Auth, İşletmeler + Yöneticiler (SUPER_ADMIN), Giderler, Gider
Türleri, Ürünler/Tabaklar (boy + reçete + otomatik maliyet/kâr), Malzemeler, Stok Hareketleri,
Tedarikçiler (alış + kısmi ödeme + borç), Düzenli Giderler (dönem ödeme), Paket Servis Platformları,
Çalışanlar, Gün Sonu Satışları (satır satır giriş — Excel şablonu netleşince dosya yükleme eklenecek),
Gün Sonu Kapanışı (gerçek giriş + fire/kayıp raporu), Raporlar, Denetim Kayıtları ve bildirimler
(kalıcı + anlık). ADMIN panelinde düşük stok ve ödenmemiş düzenli gider uyarıları gösterilir.
