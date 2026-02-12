import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const FREE_BIDS_COUNT = 3;
const STORAGE_KEY = "collisioncollect-shop-subscription";

/** 50% off for body shops that had a subscription but won no jobs (second month try) */
export const NO_JOB_DISCOUNT_RATE = 0.5;

type SubscriptionState = {
  freeBidsRemaining: number;
  isSubscribed: boolean;
  recurring: boolean;
  /** True after first time they subscribe (so we can offer 50% off on renewal if they got no jobs) */
  hadSubscriptionBefore: boolean;
};

const defaultState: SubscriptionState = {
  freeBidsRemaining: FREE_BIDS_COUNT,
  isSubscribed: false,
  recurring: false,
  hadSubscriptionBefore: false,
};

function loadState(): SubscriptionState {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s) as SubscriptionState;
      return {
        freeBidsRemaining: typeof parsed.freeBidsRemaining === "number" ? parsed.freeBidsRemaining : FREE_BIDS_COUNT,
        isSubscribed: Boolean(parsed.isSubscribed),
        recurring: Boolean(parsed.recurring),
        hadSubscriptionBefore: Boolean(parsed.hadSubscriptionBefore),
      };
    }
  } catch (_) {}
  return { ...defaultState };
}

function saveState(state: SubscriptionState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

type SubscriptionContextValue = {
  freeBidsRemaining: number;
  isSubscribed: boolean;
  recurring: boolean;
  hadSubscriptionBefore: boolean;
  canPlaceBid: () => boolean;
  recordBidPlaced: () => void;
  subscribe: (recurring: boolean) => void;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SubscriptionState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const canPlaceBid = useCallback(() => {
    return state.isSubscribed || state.freeBidsRemaining > 0;
  }, [state.isSubscribed, state.freeBidsRemaining]);

  const recordBidPlaced = useCallback(() => {
    setState((prev) => {
      if (prev.isSubscribed) return prev;
      if (prev.freeBidsRemaining <= 0) return prev;
      return { ...prev, freeBidsRemaining: prev.freeBidsRemaining - 1 };
    });
  }, []);

  const subscribe = useCallback((recurring: boolean) => {
    setState((prev) => ({ ...prev, isSubscribed: true, recurring, hadSubscriptionBefore: true }));
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        freeBidsRemaining: state.freeBidsRemaining,
        isSubscribed: state.isSubscribed,
        recurring: state.recurring,
        hadSubscriptionBefore: state.hadSubscriptionBefore,
        canPlaceBid,
        recordBidPlaced,
        subscribe,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}

const SUBSCRIPTION_MONTHLY_PRICE = 29;

export function getSubscriptionStats(): { activeCount: number; monthlyRevenue: number } {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s) as SubscriptionState;
      if (parsed.isSubscribed) return { activeCount: 1, monthlyRevenue: SUBSCRIPTION_MONTHLY_PRICE };
    }
  } catch (_) {}
  return { activeCount: 0, monthlyRevenue: 0 };
}

export { FREE_BIDS_COUNT };
