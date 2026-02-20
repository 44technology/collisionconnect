# Ödeme (Stripe) Kurulumu

Unlock ödemeleri **Stripe Checkout** ile alınıyor. Bu yapı **Apple App Store ile uyumludur**: dijital içerik satışı değil, aracı hizmet (body shop’larla bağlantı) ücreti; ödeme harici (Stripe) yapıldığı için Apple komisyonu (%15–30) uygulanmaz.

## Netlify’da

1. [Stripe Dashboard](https://dashboard.stripe.com) → API Keys → **Secret key**’i kopyala.
2. Netlify → Site → Site settings → Environment variables:
   - `STRIPE_SECRET_KEY` = `sk_live_...` (canlı) veya `sk_test_...` (test).
3. (İsteğe bağlı) Stripe’da sabit fiyatlı ürün oluşturup `STRIPE_UNLOCK_PRICE_ID` = `price_...` tanımlayabilirsin; yoksa fonksiyon $4.99’u otomatik kullanır.

## Yerel test

```bash
netlify dev
```

`STRIPE_SECRET_KEY` için `.env` veya `netlify.toml` içinde `[functions]` altında `[functions.environment]` ile verebilirsin (secret’ı repo’ya koyma).

## Akış

1. Kullanıcı “Unlock – $4.99” der → `create-checkout-session` çağrılır.
2. Stripe Checkout sayfasına yönlendirilir, ödeme yapar.
3. Başarıda uygulamaya `?session_id=...` ile döner; `verify-session` ile doğrulanır ve unlock kaydedilir.
