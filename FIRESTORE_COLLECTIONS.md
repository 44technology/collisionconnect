# Firestore Koleksiyonları

Uygulama şu koleksiyonları kullanır. Firestore’da koleksiyonlar **ilk doküman eklendiğinde** otomatik oluşur; boş koleksiyon oluşturmanız gerekmez.

---

## 1. `customers` (Müşteriler)

- **Doc ID:** Firebase Auth `uid` (müşteri giriş yaptığında otomatik)
- **Ne zaman oluşur:** Müşteri kayıt olduğunda (`/register` veya talep sırasında hesap oluşturma)
- **Alanlar:**
  - `displayName` (string)
  - `email` (string)
  - `phone` (string, opsiyonel)
  - `createdAt` (string, ISO tarih)

---

## 2. `admin` (Admin kullanıcıları)

- **Doc ID:** Firebase Auth `uid` (admin kullanıcısının UID’si)
- **Ne zaman oluşur:** İlk admin’i elle eklediğinizde (uygulama içi kayıt yok)
- **Nasıl eklenir:**
  1. Firebase Console → **Authentication** → **Users** → **Add user** (admin email + şifre)
  2. Oluşan kullanıcının **UID**’sini kopyalayın
  3. **Firestore** → **Start collection** → Collection ID: `admin`
  4. Document ID olarak bu **UID**’yi girin
  5. Alanlar: `displayName` (string, örn. "Admin"), `email` (string)
  6. Ayrıca **users** koleksiyonunda aynı UID ile bir doküman oluşturun: `userType` (string): `"admin"`, `email` (string)

Böylece admin girişi çalışır ve `admin` koleksiyonu görünür.

---

## 3. `bodyshop` (Body shop listesi – admin’in yönettiği)

- **Doc ID:** Otomatik (Firebase `addDoc` ile)
- **Ne zaman oluşur:** Admin panelinden “Add body shop” veya “Import from map” ile ilk dükkan eklendiğinde
- **Alanlar:**
  - `name` (string)
  - `whatsappPhone` (string)
  - `zipCode` (string, opsiyonel)
  - `address` (string, opsiyonel)
  - `email` (string, opsiyonel)
  - `createdAt` (timestamp)

---

## 4. `quote` (Body shop teklifleri)

- **Doc ID:** Otomatik
- **Ne zaman oluşur:** Bir body shop `/quote/CC-XXX-YYY` sayfasından teklif gönderdiğinde
- **Alanlar:**
  - `requestRefId` (string)
  - `shopName`, `contactPerson`, `address`, `email`, `phone` (string)
  - `price` (number)
  - `estimatedCompletion` (string)
  - `createdAt` (timestamp)

---

## Ek koleksiyonlar (uygulama kullanıyor)

| Koleksiyon    | Açıklama |
|---------------|----------|
| `users`       | Giriş tipi: her kullanıcı için `userType` ("customer" \| "shop" \| "admin") + `email`. Auth sonrası profil için okunur. |
| `requests`    | Müşteri talepleri; doc ID = `refId` (örn. CC-A1B2-C3D4). Quote linki buradan okunur. |
| `requestMeta` | Talep bazında “müşteriye gösterilen” teklif ID’leri. |
| `unlocks`     | Ödeme yapılmış (unlock) talepler. |

---

## Özet

- **customers:** Müşteri kaydıyla otomatik dolar.
- **admin:** İlk admin’i Authentication’da oluşturup, Firestore’da `admin` ve `users` koleksiyonlarına aynı UID ile doküman ekleyerek “oluşturursunuz”.
- **bodyshop:** Admin panelinden ilk body shop eklendiğinde oluşur.
- **quote:** İlk teklif quote sayfasından gönderildiğinde oluşur.

Kurallar için `firestore.rules.example` dosyasını Firebase Console → Firestore → Rules kısmına uyarlayabilirsiniz.
