# Backend (Firebase) – Yapılacaklar Sırası

Firebase Console’da proje açıldı, bu adımlar kodu Firebase’e bağlar.

---

## ✅ 1. Firebase SDK + Config (TAMAMLANDI)

- `firebase` paketi eklendi.
- `.env.example` oluşturuldu → proje kökünde `.env` kopyala, Firebase Console’daki değerleri doldur.
- `src/lib/firebase.ts` → `auth` ve `db` (Firestore) export ediliyor.
- `.env` git’e eklenmemesi için `.gitignore`’a eklendi.

**Senin yapacakların:** `.env` dosyası oluşturup Firebase proje ayarlarındaki (SDK setup) değerleri yaz.

---

## ✅ 2. Firebase Authentication (TAMAMLANDI)

- `authContext.tsx`: Firebase Auth + Firestore `users/{uid}` profili (userType, displayName, email, shopName vb.).
- Email/şifre ile giriş: `loginWithEmailAndPassword` (Login, LoginShop, LoginAdmin).
- Kayıt: `registerCustomer` (Register), `registerShop` (RegisterShop). Firestore’da `users` koleksiyonu oluşturuluyor.
- **Firebase Console’da yapman gerekenler:**
  - **Authentication** → **Sign-in method** → **Email/Password**’ü **Enable** yap.
  - İlk admin için: Bir kullanıcı ile kayıt ol veya giriş yap, sonra Firestore’da **users** → ilgili dokümanı aç → **userType** alanını **"admin"** yap (veya dokümana `userType: "admin"` ekle).

---

## 3. Firestore – Requests (Talepler)

- **Collection:** `requests`
- Yeni talep: `NewRequest` formu → Firestore’a `addDoc(requests, { ... })`.
- Liste: Müşteri dashboard, Shop dashboard, Admin dashboard → `getDocs(requests)` veya `onSnapshot`.
- `shopRequests.ts` ve sabit array kaldırılacak; veri sadece Firestore’dan okunacak.
- ID: Firestore doküman id’si string (mevcut sayfalarda `:id` route uyumluluğu için gerekirse map tutulur).

---

## 4. Firestore – Bids (Teklifler) + Request Meta

- **Collection:** `bids` (veya `requests/{requestId}/bids` subcollection).
- Alanlar: `requestId`, `amount`, `note`, `shopName`, `shopId`, `createdAt`.
- Admin’in “müşteriye gösterilecek teklifler” ve “kazanan teklif”: `requests/{id}` dokümanında `visibleBidIds`, `winningBidAmount` gibi alanlar veya ayrı `requestMeta` collection.
- `bidsStore.tsx`: State yerine Firestore’dan oku/yaz (`onSnapshot`, `addDoc`, `updateDoc`).

---

## 5. Kullanıcı profilleri + Abonelik

- **Collection:** `users` → `users/{uid}`: `userType`, `displayName`, `email`, `shopName?`, `subscription` (isSubscribed, recurring, freeBidsRemaining vb.).
- Login/Register sonrası bu doküman oluştur/güncelle.
- `subscriptionStore.tsx`: Abonelik durumunu Firestore’dan oku/yaz (opsiyonel: önce localStorage ile devam, sonra taşı).

---

## Özet sıra

1. ✅ Firebase SDK + config  
2. Firebase Auth + authContext  
3. Firestore requests (yeni talep + listeler)  
4. Firestore bids + request meta  
5. Users + subscription (Firestore’a taşıma)

Her adımda önce geliştirme ortamında test edip sonra bir sonrakine geçmek iyi olur.
