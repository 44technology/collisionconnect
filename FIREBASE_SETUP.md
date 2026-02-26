# Firebase’i Projeye Bağlama

Bu rehber, Firebase (Authentication + Firestore) projenizi Collision Connect uygulamasına nasıl bağlayacağınızı adım adım anlatır.

---

## 1. Firebase Console’da Yapılacaklar

### 1.1 Proje oluşturma (yoksa)

1. [Firebase Console](https://console.firebase.google.com/) → **Proje Ekle**.
2. Proje adı verin (örn. `collision-collect`) → İsterseniz Analytics’i kapatın → **Oluştur**.

### 1.2 Firestore Database

1. Sol menüden **Build** → **Firestore Database**.
2. **Create database** → **Start in test mode** (geliştirme için; sonra kuralları sıkılaştırın).
3. Bölge seçin (örn. `europe-west1`) → **Enable**.

### 1.3 Authentication (Email/Password)

1. Sol menüden **Build** → **Authentication**.
2. **Get started**.
3. **Sign-in method** sekmesi → **Email/Password** → **Enable** → **Save**.

### 1.4 Web uygulaması ekleme ve config alma

1. Proje genel sayfasında dişli ikon → **Proje ayarları**.
2. **Genel** sekmesinde aşağı kaydırın → **Uygulamanız** bölümü.
3. **</>** (Web) ikonuna tıklayın.
4. Uygulama takma adı girin (örn. `Collision Connect`) → **Uygulamayı kaydet** (Firebase Hosting’i şimdilik işaretlemeyin).
5. Açılan pencerede **firebaseConfig** objesi görünür. Bu değerleri kopyalayacaksınız:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "PROJE-ID.firebaseapp.com",
  projectId: "PROJE-ID",
  storageBucket: "PROJE-ID.firebasestorage.app",
  messagingSenderId: "123...",
  appId: "1:123...:web:abc..."
};
```

---

## 2. Yerel projede bağlama (.env)

1. Proje kökünde `.env` dosyası oluşturun (veya `.env.example`’ı kopyalayıp `.env` yapın).
2. Firebase config değerlerini şu değişkenlere yazın (hepsi **VITE_** ile başlamalı, yoksa tarayıcıda görünmez):

| Ortam değişkeni | Firebase config alanı | Zorunlu |
|-----------------|------------------------|--------|
| `VITE_FIREBASE_API_KEY` | `apiKey` | Evet |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` | Evet |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` | Evet |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` | Önerilir |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` | Önerilir |
| `VITE_FIREBASE_APP_ID` | `appId` | Önerilir |

Örnek `.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=collision-collect.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=collision-collect
VITE_FIREBASE_STORAGE_BUCKET=collision-collect.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=383967716105
VITE_FIREBASE_APP_ID=1:383967716105:web:da77a6411d2888157aa9d8
```

3. `.env` dosyasını **asla** Git’e eklemeyin (zaten `.gitignore`’da olmalı).
4. Uygulamayı yeniden başlatın:

```bash
npm run dev
```

Tarayıcıda giriş yapabiliyor ve talepler/teklifler çalışıyorsa yerel bağlantı tamamdır.

---

## 3. Netlify’da bağlama (deploy için)

Netlify’a deploy ettiğinizde aynı değerlerin orada da tanımlı olması gerekir.

1. [Netlify Dashboard](https://app.netlify.com/) → Sitenizi seçin.
2. **Site configuration** (veya **Site settings**) → **Environment variables**.
3. **Add a variable** / **Add env var** → **Add single variable** (veya **Import from .env** ile toplu ekleyebilirsiniz).
4. Aşağıdaki değişkenleri tek tek ekleyin (`.env`’deki değerlerle aynı):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

5. **Save** → **Deploys** → **Trigger deploy** (veya bir sonraki push’ta otomatik deploy alır).

Böylece canlı sitede de Firebase (Auth + Firestore) kullanılır; quote linkleri ve admin paneli çalışır.

---

## 4. Firestore güvenlik kuralları

Firebase Console → **Firestore Database** → **Rules** sekmesinde kuralları yapılandırın. Projede örnek bir dosya var: `firestore.rules.example`. İçeriğini kopyalayıp Rules editörüne yapıştırabilir, ardından ihtiyaca göre sıkılaştırabilirsiniz. Test için “test mode” kullanıyorsanız bir süre `read, write: if true` ile çalışabilirsiniz; yayına almadan önce mutlaka `request.auth` ve rollerle kısıtlayın.

---

## 5. İlk admin kullanıcısı

1. Firebase Console → **Authentication** → **Users** → **Add user**.
2. Admin e-posta ve şifre girin.
3. **Firestore** → **users** koleksiyonu → **Add document**.
4. **Document ID**: Az önce oluşturduğunuz kullanıcının **UID**’si (Authentication → Users’ta kullanıcıya tıklayınca görünür).
5. Alanlar:
   - `userType` (string): `admin`
   - `displayName` (string): `Admin`
   - `email` (string): admin e-posta

Bundan sonra bu e-posta/şifre ile `/login/admin` sayfasından giriş yapabilirsiniz.

---

## 6. Storage (talep fotoğrafları)

Talep oluşturulurken yüklenen fotoğraflar **Firebase Storage**’a kaydedilir. Storage’ı açıp kuralları ayarlayın:

1. Firebase Console → **Build** → **Storage** → **Get started** (test mode ile başlayabilirsiniz).
2. **Rules** sekmesinde aşağıdakine benzer kural kullanın (giriş yapmış kullanıcılar `requests/` altına yazabilsin; herkes okuyabilsin):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /requests/{refId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

3. **Publish** ile kaydedin. Böylece talep sayfasında fotoğraflar da görünür.

---

## Özet kontrol listesi

- [ ] Firebase’de proje oluşturuldu
- [ ] Firestore açıldı (test veya production)
- [ ] Authentication → Email/Password açıldı
- [ ] Web uygulaması eklendi, config kopyalandı
- [ ] Yerel `.env` dosyasına `VITE_FIREBASE_*` değişkenleri yazıldı
- [ ] Netlify’da aynı env değişkenleri tanımlandı ve deploy alındı
- [ ] Firestore Rules ayarlandı (en azından `firestore.rules.example` ile)
- [ ] İlk admin kullanıcısı Auth + Firestore `users` dokümanı oluşturuldu
- [ ] Storage açıldı ve kurallar ayarlandı (talep fotoğrafları için)

Bu adımlardan sonra uygulama Firebase’e bağlı çalışır; talepler ve fotoğraflar kaydedilir, talep detayında ve quote linkinde görünür.
