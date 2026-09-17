# taneHesap — Frontend

React (TypeScript) + Vite. Backend'i (`TaneHesap.API`) tüketen ayrı bir SPA; kapsam ve karar geçmişi
için `../proje-raporu.md` dosyasına bakın.

## Katmanlar

```
src/
  api/            httpClient (axios + JWT interceptor + otomatik refresh), authApi, token saklama.
  auth/           AuthContext/useAuth (tek kimlik doğrulama kaynağı), RequireAuth (rota koruması).
  types/          Backend DTO'larıyla birebir eşleşen TS tipleri (auth, notification).
  config/         navigation.ts — kenar çubuğu + rota koruması için TEK KAYNAK modül/rol listesi.
  layout/         AppLayout — kenar çubuğu, üst bar, bildirim zili, çıkış.
  routes/         AppRoutes — navigation.ts'ten üretilen rota tablosu.
  realtime/       useNotificationsHub — SignalR (/hubs/notifications) bağlantısı.
  components/     Paylaşılan küçük bileşenler (NotificationsBell).
  pages/          auth/ (giriş), dashboard/ (panel), common/ (ComingSoonPage, NotFoundPage).
```

Bağımlılık yönü: `pages`/`layout` → `auth`/`api`/`config` → hiçbiri React Router veya sayfalara
geri bağımlı değil. Yeni bir modül eklemek için:

1. `config/navigation.ts`'e path/label/roller eklenir (tek kaynak).
2. `routes/AppRoutes.tsx` bu listeyi otomatik okuduğu için ekstra bir şey gerekmez —
   `ComingSoonPage` yerine gerçek sayfa bileşenini yazıp route'ta değiştirmek yeterli.

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

- `npm run build` — tip kontrolü (`tsc -b`) + üretim derlemesi.
- `npm run lint` — oxlint.

## Durum

Auth (giriş, TOTP, otomatik token yenileme, çıkış), rol bazlı rota koruması, kenar çubuğu/panel
kabuğu ve SignalR bildirim entegrasyonu çalışır durumda. Diğer modüllerin (Giderler, Stok, Gün
Sonu, Raporlar vb.) backend API'leri hazır (bkz. proje raporu bölüm 10); bu modüllerin arayüzleri
`ComingSoonPage` yer tutucusuyla `config/navigation.ts`'te tanımlı, sırayla gerçek sayfalarla
değiştirilecek.
