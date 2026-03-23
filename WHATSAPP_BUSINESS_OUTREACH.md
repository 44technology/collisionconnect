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

## 2. Önerilen ürün akışı

1. **Müşteri** talebi + fotoğrafları oluşturur (Firestore + Storage — zaten var).
2. **Admin** “WhatsApp ile gönder”e basar → **backend** şunu yapar:
   - İlgili `refId` için foto URL’lerini Storage’dan alır.
   - Her hedef body shop numarası için Cloud API’ye sırayla:
     - Kısa metin: Fixly, resmi talep, araç özeti, ZIP, süre.
     - Ardından her foto için `image` mesajı (veya medya grubu desteği API sürümüne göre).
   - Son mesajda: **Kısa, güvenilir link** (hash’li quote sayfası) veya “Fiyatı şu formatta yanıtlayın: `QUOTE CC-XXX 2500`” gibi **parse edilebilir metin**.
3. **İsteğe bağlı — webhook:**
   - Gelen mesajları dinleyip fiyatı regex / NLP ile `quotes` koleksiyonuna yazmak.
   - Ya da sadece linkteki mevcut **Quote sayfası** ile devam (daha az Meta incelemesi).

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

**Tipik akış örneği**

1. **Webhook** (Fixly admin’den) → body: `{ "refId": "CC-...", "shopPhones": ["1...", ...] }`.
2. **HTTP Request** → sizin `GET /api/internal/request/CC-...` (foto URL’leri + özet metin) — bu endpoint sunucuda Firestore/Storage okur, **service account** ile.
3. **Split in batches** → her telefon için döngü.
4. **WhatsApp Cloud API** node (veya HTTP Request ile Graph API) → önce metin, sonra her `image.link` (Storage public URL veya önce medya upload).
5. İsteğe bağlı: gelen yanıtlar için **ayrı webhook** workflow’u (Meta “messages” webhook’unu n8n’e yönlendirme) → fiyatı parse edip yine internal API ile `quotes` yazma.

**Özet:** n8n = “beyin ve kablolama”; WhatsApp ve güvenli veri erişimi için yine **Meta + sunucu tarafı bir API** (en azından ince bir katman) gerekir.

---

## 7. Sonraki adım (kod)

Onay verirseniz bir sonraki iterasyonda:

1. `netlify/functions/send-quote-whatsapp.js` iskeleti (env: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`),
2. Admin’den güvenli çağrı (Firebase Admin veya paylaşılan secret),
3. `refId` → Firestore + Storage URL → Graph API `messages` dökümü

eklenebilir. **Meta uygulama ve onaylı şablonlar** olmadan production’da ilk mesajlar çalışmayabilir; bu kısım iş/operasyon.
