# WhatsApp Business ile güvenilir teklif akışı (tasarım)

Şu anki akış: Admin paneli `wa.me` linki açıp metin + URL gönderiyor. Bu, tarayıcıdan **alıcıya fotoğraf göndermez** ve link önizlemesi bazen yanlış marka gösterir → “fraud” algısı.

Hedef: Body shop’a **Fixly Business numarasından** doğrudan **hasar fotoğrafları + kısa metin + (isteğe bağlı) etkileşim** gitmesi; fiyatı yine uygulamaya veya mesaja bağlamak.

---

## 1. Ne gerekiyor? (teknik gerçek)

| İstek | `wa.me` (mevcut) | WhatsApp Cloud API |
|--------|------------------|---------------------|
| Karşı numaraya foto gönderme | Hayır | Evet (sunucu çağrısı) |
| Çoklu alıcıya aynı içerik | Elle tek tek | Evet (döngü veya kuyruk) |
| “Teklif verir misiniz?” butonu | Hayır (sadece metin) | Kısmen (şablon + butonlar, kurallara tabi) |
| Gelen yanıtı (fiyat) işleme | Hayır | Evet (webhook) |

**“Grup olarak gönderme”:** WhatsApp Cloud API ile müşteri grubu oluşturup herkesi aynı gruba eklemek, genelde **iş modeli / politika** açısından kısıtlı veya önerilmez. Pratikte:

- Her body shop numarasına **aynı medya setini 1:1** göndermek (Fixly Business’tan),
- veya tek bir “koordinatör” grubu (manuel / ayrı süreç) kullanmak daha yaygındır.

---

## 2. Önerilen ürün akışı — üç aşamalı mesaj (güven + link en sonda)

Amaç: Önce **kaza fotoğrafları + araç/hasar bilgisi** gitsin (link yok veya çok az); güven oluşunca **isteğe bağlı teklif** sorulsun; **“Evet”** denince **fiyat girme** (mevcut quote sayfası veya kısa form linki) açılsın; teklifler **Firestore `quote`** altında toplansın, **admin** zaten talep detayından görsün.

### Aşama 1 — Sadece içerik (foto + bilgi)

Sıra önerisi (WhatsApp Cloud API; gönderim **Netlify veya Firebase function** içinde döngü ile):

1. **Kısa giriş metni** (tek mesaj):  
   *“Fixly: doğrulanmış bir tamir talebi. Aşağıda araç ve hasar fotoğrafları ile özet bilgiler yer alıyor.”*
2. **Hasar fotoğrafları** — her biri `image` mesajı (veya API’nin desteklediği şekilde sırayla). İlk mesajda link **göndermeyin** (fraud algısını düşürür).
3. **Özet metin bloğu** (fotoğraflardan hemen sonra, tek mesaj):  
   - Referans: `CC-XXXX-YYYY`  
   - Araç: marka / model / yıl / trim (varsa)  
   - Hasar özeti  
   - ZIP  
   - Müşterinin istediği süre (varsa)  
   - İsteğe bağlı: VIN

Veri kaynağı: Firestore `requests/{refId}` + Storage `requests/{refId}/...` (uygulamada mevcut).

### Aşama 2 — Onay sorusu (fiyat vermek ister misiniz?)

Ayrı bir mesaj (24 saat oturumu içinde normal metin; **ilk soğuk mesaj** ise Meta **şablon** gerekebilir):

- *“Bu tamir talebi için teklif vermek ister misiniz?*  
  *Evet derseniz bir sonraki adımda fiyat ve süre girebileceğiniz güvenli linki göndereceğiz.”*

Etkileşim seçenekleri (hangisi kolayınıza gelirse):

- **Metin:** *“Evet için EVET, ilgilenmiyorsanız HAYIR yazın.”*  
- **Interactive reply / buton** (Cloud API sürümüne ve onaylı şablona bağlı).

### Aşama 3 — Sadece “Evet” sonrası price / quote linki

- **Webhook** (Meta → **Netlify/Firebase function**): gelen mesajı normalize et (`evet`, `EVET`, emoji vb.).
- Eşleşirse **bir kez** şu mesajı gönder:
  - Kısa açıklama + **hash’li quote URL** (mevcut: `https://<site>/#/quote/<refId>?n=...&p=...` shop parametreleri ile).
- Body shop **Quote sayfasında** fiyat + süre doldurur → uygulama zaten **`addQuoteAsync` / Firestore `quote`** ile kaydeder.
- **Admin:** `AdminRequestDetail` üzerinden teklifleri görür / müşteriye açma (mevcut UI).

**Hayır** veya cevap yok: ikinci mesajı göndermeyin veya teşekkür şablonu (isteğe bağlı).

### Durum takibi (öneri)

Çift gönderimi önlemek ve rapor için (Firestore):

- `outreachSessions/{refId}_{normalizedPhone}`: `phase: 1|2|3`, `consentAt`, `quoteLinkSentAt`.

### Özet tablo

| Aşama | İçerik | Link? |
|--------|--------|--------|
| 1 | Foto + araç/hasar bilgisi | Hayır (tercihen) |
| 2 | “Fiyat vermek ister misiniz?” | Hayır |
| 3 | Quote / price girişi | Evet (sadece EVET sonrası) |

---

## 3. Meta / Netlify tarafında yapılacaklar (özet)

1. [Meta for Developers](https://developers.facebook.com/) → WhatsApp → **Cloud API** → işletme doğrulama, telefon numarası.
2. **Kalıcı access token** + **Phone Number ID** + **WhatsApp Business Account ID** (ortam değişkenlerinde saklanır, **asla** frontend’e koyulmaz).
3. Netlify **serverless function** veya Firebase **Cloud Function**:
   - Admin panelden `POST` (auth: sadece admin Firebase token veya secret).
   - Function: `POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages` ile `type: image` + `image.link` (Storage URL’leri **herkese açık okunabilir** olmalı veya önce medyayı API’ye upload).
4. **24 saat penceresi / şablon mesajlar:** İlk iletişimde çoğu zaman **onaylı template** gerekir; ürün ekibiyle “utility” şablon metinlerini Meta’ya onaylatmak gerekir.

---

## 4. Bu repo ile uyum

- Talep verisi: `requests/{refId}` + Storage `requests/{refId}/...` (mevcut).
- Admin tetikleyici: `AdminRequestDetail` içindeki WhatsApp butonu yerine veya yanına **“API ile gönder”** → `fetch('/.netlify/functions/send-quote-whatsapp', { ... })`.
- Yeni dosya örneği: `netlify/functions/send-quote-whatsapp.js` (veya `functions/` altında Firebase) — **token sadece sunucuda**.

---

## 5. Kısa vadeli iyileştirmeler (API olmadan)

- `index.html` Open Graph / Twitter meta’ları Fixly + `fixy-logo.png` (yapıldı); WhatsApp önizlemesi için [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) ile URL yenileme.
- Mesaj metninde linki **en sona**, kısa tutma; mümkünse kendi domain’in (`fixly.com` vb.) CNAME ile Netlify.

---

## 6. Backend’de uygulama özeti (n8n yok)

Otomasyon **doğrudan bu repodaki sunucu tarafı** ile yapılır: **Netlify Functions** ve/veya **Firebase Cloud Functions**. n8n kullanılmıyor.

**Giden mesajlar (admin tetikler)**

1. `POST /.netlify/functions/...` (veya Firebase callable): body’de `refId`, hedef telefon listesi, isteğe bağlı shop parametreleri.
2. Function: Firestore `requests/{refId}` + Storage URL’lerini okur → her numara için Graph API sırasıyla: **Aşama 1** (metin + görseller + özet) → kısa gecikme → **Aşama 2** (onay sorusu). Link **gönderilmez**.

**Gelen mesajlar (EVET / HAYIR)**

1. Meta **Webhook URL**’i aynı Netlify/Firebase endpoint’ine işaret eder.
2. Function: mesajı parse et → `EVET` ve `outreachSessions`’ta link henüz gitmediyse **Aşama 3** quote URL’ini Graph API ile gönder.
3. Fiyat girişi yine mevcut **Quote sayfası** + Firestore `quote`; admin UI aynı.

---

## 7. Sonraki adım (kod)

Onay verirseniz bir sonraki iterasyonda:

1. `netlify/functions/send-quote-whatsapp.js` (veya Firebase eşdeğeri) — giden mesajlar, env: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
2. `netlify/functions/whatsapp-inbound.js` — Meta webhook: `EVET` sonrası quote linki gönderme + `outreachSessions` güncelleme,
3. Admin’den güvenli çağrı (Firebase Admin veya paylaşılan secret),
4. `refId` → Firestore + Storage URL → Graph API `messages` dökümü (§2 sırasına uygun).

**Meta uygulama ve onaylı şablonlar** olmadan production’da ilk mesajlar çalışmayabilir; bu kısım iş/operasyon.
