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

## 6. Sonraki adım (kod)

Onay verirseniz bir sonraki iterasyonda:

1. `netlify/functions/send-quote-whatsapp.js` iskeleti (env: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`),
2. Admin’den güvenli çağrı (Firebase Admin veya paylaşılan secret),
3. `refId` → Firestore + Storage URL → Graph API `messages` dökümü

eklenebilir. **Meta uygulama ve onaylı şablonlar** olmadan production’da ilk mesajlar çalışmayabilir; bu kısım iş/operasyon.
