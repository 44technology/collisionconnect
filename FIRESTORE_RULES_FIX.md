# "Missing or insufficient permissions" Hatası

Bu hata **şifre yanlış** değil. Giriş (Authentication) başarılı oluyor; ancak giriş sonrası **Firestore**’dan profil okunurken kurallar okumayı engelliyor.

## Ne Yapmalısın?

### 1. Firebase Console’da kuralları güncelle

1. [Firebase Console](https://console.firebase.google.com/) → projeni seç
2. Sol menüden **Build** → **Firestore Database**
3. Üstte **Rules** sekmesine tıkla
4. Aşağıdaki kuralların **tamamını** kopyala ve mevcut metnin **yerine** yapıştır
5. **Publish** (Yayınla) butonuna bas

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /customers/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /admin/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /bodyshop/{shopId} {
      allow read, write: if request.auth != null;
    }
    match /quote/{quoteId} {
      allow read, write: if true;
    }
    match /requests/{refId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
    match /requestMeta/{requestRefId} {
      allow read, write: if true;
    }
    match /unlocks/{requestRefId} {
      allow read, write: if true;
    }
  }
}
```

### 2. Admin dokümanının yeri ve ID’si

Admin girişinde uygulama şunları okuyor:

- **users** koleksiyonu → doc id = **giriş yapan kullanıcının UID’si**
- **admin** koleksiyonu → doc id = **aynı UID**

Yani:

1. **Authentication** → **Users** → admin kullanıcısına tıkla → **User UID**’yi kopyala (örn. `xYz123AbC...`)
2. **Firestore** → **users** koleksiyonu → Document ID tam olarak bu **UID** olan bir doküman olmalı, içinde en az:  
   `userType` (string): `admin`
3. **Firestore** → **admin** koleksiyonu → Document ID yine **aynı UID** olan bir doküman olmalı, içinde:  
   `displayName`, `email` (istersen sadece bunlar)

Doc id’yi yanlış (örn. "admin1" veya email) yazdıysan, kural `request.auth.uid == userId` sağlanmaz ve "Missing or insufficient permissions" alırsın.

### 3. Özet

| Sorun | Çözüm |
|--------|--------|
| Kurallar hiç yayınlanmamış / varsayılan | Yukarıdaki kuralları Rules sekmesine yapıştırıp **Publish** et |
| users veya admin doc id UID değil | Her iki koleksiyonda da doc id = Authentication’daki User UID olsun |
| Koleksiyon adı farklı | Koleksiyon adları tam olarak `users` ve `admin` olsun (küçük harf) |

Bunlardan sonra tekrar admin girişi dene; "Missing or insufficient permissions" kaybolmalı.
