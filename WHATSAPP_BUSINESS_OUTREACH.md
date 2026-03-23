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

Sıra önerisi (Cloud API / n8n döngüsü):

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

- **Webhook** (Meta → n8n veya kendi API): gelen mesajı normalize et (`evet`, `EVET`, emoji vb.).
- Eşleşirse **bir kez** şu mesajı gönder:
  - Kısa açıklama + **hash’li quote URL** (mevcut: `https://<site>/#/quote/<refId>?n=...&p=...` shop parametreleri ile).
- Body shop **Quote sayfasında** fiyat + süre doldurur → uygulama zaten **`addQuoteAsync` / Firestore `quote`** ile kaydeder.
- **Admin:** `AdminRequestDetail` üzerinden teklifleri görür / müşteriye açma (mevcut UI).

**Hayır** veya cevap yok: ikinci mesajı göndermeyin veya teşekkür şablonu (isteğe bağlı).

### Durum takibi (öneri)

Çift gönderimi önlemek ve rapor için (Firestore veya n8n DB):

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

## 6. n8n ile otomasyon (alternatif mimari)

**Evet —** WhatsApp tarafı yine **WhatsApp Cloud API** (veya Twilio WhatsApp gibi bir sağlayıcı) gerektirir; n8n bunun **üstünde** iş akışını yönetir.

**Artıları**

- Görsel akış: “tetikle → veriyi çek → foto gönder → metin gönder → hata yakala / tekrar dene”.
- Cron, kuyruk, Slack uyarısı, A/B metin gibi şeyleri koda gömmeden eklenebilir.
- Fixly uygulamasında sadece **tek bir webhook** kalabilir: örn. admin “Gönder” → `POST https://n8n.sizin-domain.com/webhook/quote-broadcast` + `refId` + shop listesi veya secret token.

**Eksileri / dikkat**

- n8n’i **kendin host** etmeniz (Docker/VPS) veya **n8n Cloud** ücreti; üretimde güvenlik ve yedekleme sizin sorumluluğunuzda.
- Firestore/Storage’dan veri almak için: **HTTP Request** node ile kendi küçük API’niz, veya Firebase REST (kural/kimlik karmaşık), veya n8n’de credential’lı bir Firebase eklentisi — pratikte çoğu ekip **basit bir “internal API”** (Netlify/Firebase function) bırakıp n8n’in sadece WhatsApp ve dallanmayı yapmasını tercih eder.
- WhatsApp için yine **şablon mesajlar**, **24 saat penceresi**, Meta inceleme kuralları geçerli; n8n bunları değiştirmez.

**Tipik akış örneği** (§2 üç aşamalı akışla uyumlu)

1. **Webhook** (Fixly admin’den) → body: `{ "refId": "CC-...", "shopPhones": ["1...", ...] }`.
2. **HTTP Request** → sizin `GET /api/internal/request/CC-...` (foto URL’leri + özet metin) — bu endpoint sunucuda Firestore/Storage okur, **service account** ile.
3. **Split in batches** → her telefon için döngü.
4. **Aşama 1:** WhatsApp → giriş metni → sırayla `image` → özet bilgi metni (**link yok**).
5. **Aşama 2:** (aynı workflow’da gecikme veya ayrı “schedule”) → “Fiyat vermek ister misiniz?” metni.
6. **Inbound workflow:** Meta webhook → mesaj `EVET` ise **Aşama 3:** quote URL gönder; değilse bitir veya teşekkür.
7. Fiyat girişi mevcut **Quote sayfası** ile Firestore’a yazılır; admin paneli aynı kalır.

**Özet:** n8n = “beyin ve kablolama”; WhatsApp ve güvenli veri erişimi için yine **Meta + sunucu tarafı bir API** (en azından ince bir katman) gerekir.

---

## 7. Sonraki adım (kod)

Onay verirseniz bir sonraki iterasyonda:

1. `netlify/functions/send-quote-whatsapp.js` iskeleti (env: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`),
2. Admin’den güvenli çağrı (Firebase Admin veya paylaşılan secret),
3. `refId` → Firestore + Storage URL → Graph API `messages` dökümü

eklenebilir. **Meta uygulama ve onaylı şablonlar** olmadan production’da ilk mesajlar çalışmayabilir; bu kısım iş/operasyon.
