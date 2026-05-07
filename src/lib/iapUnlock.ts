import { Capacitor } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE } from "@capgo/native-purchases";

const UNLOCK_PRODUCT_ID = import.meta.env.VITE_IAP_UNLOCK_PRODUCT_ID || "com.collisionconnect.unlock.details";

export function isIapUnlockAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export async function purchaseUnlockWithIap(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isIapUnlockAvailable()) {
    return { ok: false, error: "IAP is available only on iOS app builds." };
  }

  try {
    const billing = await NativePurchases.isBillingSupported();
    if (!billing?.isBillingSupported) {
      return { ok: false, error: "In-app purchases are not available on this device." };
    }

    // Load the product first so StoreKit can resolve price/product metadata.
    await NativePurchases.getProduct({
      productIdentifier: UNLOCK_PRODUCT_ID,
      productType: PURCHASE_TYPE.INAPP,
    });

    await NativePurchases.purchaseProduct({
      productIdentifier: UNLOCK_PRODUCT_ID,
      productType: PURCHASE_TYPE.INAPP,
      quantity: 1,
    });

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message || "IAP purchase failed." };
  }
}

