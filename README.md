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
  components/     Paylaşılan küçük bileşenler (NotificationsBell).
  pages/          auth/ (giriş), dashboard/ (panel), common/ (ComingSoonPage, NotFoundPage).
  pwa/            useInstallPrompt + InstallPromptBanner — "ana ekrana ekle" istemi (bkz. aşağı).
```

Bağımlılık yönü: `pages`/`layout` → `auth`/`api`/`config` → hiçbiri React Router veya sayfalara
geri bağımlı değil. Yeni bir modül eklemek için:

1. `config/navigation.ts`'e path/label/ikon/roller eklenir (tek kaynak).
2. `routes/AppRoutes.tsx` bu listeyi otomatik okuduğu için ekstra bir şey gerekmez —
   `ComingSoonPage` yerine gerçek sayfa bileşenini yazıp route'ta değiştirmek yeterli.

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

SUPER_ADMIN/ADMIN girişinde authenticator (TOTP) kodu zorunludur; EMPLOYEE'de yoktur. Giriş formu
önce kullanıcı adı/şifre ile dener, backend "Authenticator kodu gereklidir." derse ikinci adımda
kod alanını gösterir (bkz. `pages/auth/LoginPage.tsx`).

## Kurulum (yerelde)

```bash
npm install
cp .env.example .env   # VITE_API_BASE_URL'i backend'inizin adresine göre düzenleyin
npm run dev
```

- `npm run build` — tip kontrolü (`tsc -b`) + üretim derlemesi + PWA manifest/service worker üretimi.
- `npm run lint` — oxlint.

## Durum

Auth (giriş, TOTP, otomatik token yenileme, çıkış), rol bazlı rota koruması, kenar çubuğu/panel
kabuğu, SignalR bildirim entegrasyonu, "tatlı ve kurumsal" görsel tema ve PWA "ana ekrana ekle"
özelliği çalışır durumda. Diğer modüllerin (Giderler, Stok, Gün Sonu, Raporlar vb.) backend
API'leri hazır (bkz. proje raporu bölüm 10); bu modüllerin arayüzleri `ComingSoonPage`
yer tutucusuyla `config/navigation.ts`'te tanımlı, sırayla gerçek sayfalarla değiştirilecek.
