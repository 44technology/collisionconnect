# Ödeme (iOS IAP) Kurulumu

Unlock ödemeleri artık iOS tarafında **Apple In‑App Purchase (IAP)** ile alınıyor.

## App Store Connect

1. App Store Connect → uygulamanız → **In-App Purchases**.
2. Yeni ürün oluşturun (genelde **Non-Consumable**):
   - Örnek Product ID: `com.collisionconnect.unlock.details`
   - Fiyat: `$4.99`
3. Sandbox test account oluşturun (Users and Access → Sandbox).

## Proje Ayarı

`.env` dosyasına ürün kimliğini ekleyin:

```bash
VITE_IAP_UNLOCK_PRODUCT_ID=com.collisionconnect.unlock.details
```

## iOS Proje Ayarı

1. Xcode → target `App` → **Signing & Capabilities**
2. **In-App Purchase** capability ekleyin.
3. Sonra:

```bash
npx cap sync ios
```

## Test Akışı

1. Uygulamada müşteri `Details` ekranında `Pay with Apple` seçer.
2. Apple Sandbox ödeme ekranı açılır.
3. Satın alma başarılıysa request unlock olur ve body shop detayları görünür.
