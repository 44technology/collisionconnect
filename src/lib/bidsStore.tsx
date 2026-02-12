import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

/** Body shop receives this amount; customer sees amount / (1 - commission) = amount / 0.8 */
export const COMMISSION_RATE = 0.2; // 20%

export function shopAmountToCustomerPrice(shopAmount: number): number {
  return Math.round(shopAmount / (1 - COMMISSION_RATE));
}

export type Bid = { id: string; amount: number; note: string; shopName?: string; createdAt?: number };

type BidsState = Record<number, Bid[]>;

function makeBid(id: string, amount: number, note: string, shopName?: string, createdAt?: number): Bid {
  return { id, amount, note, shopName, createdAt };
}

// createdAt: newest last so when we sort desc we get 3-h, 3-g, ... 1-a
const now = Date.now();
const initialBids: BidsState = {
  1: [
    makeBid("1-a", 11600, "Includes OEM parts, 2-year warranty", "ABC Body Shop", now - 5 * 3600000),
    makeBid("1-b", 12160, "Aftermarket parts, 1-week turnaround", "Quick Fix Auto", now - 4 * 3600000),
    makeBid("1-c", 11840, "OEM parts available on request", "Metro Collision", now - 3 * 3600000),
    makeBid("1-d", 12960, "Premium paint, lifetime warranty", "Premium Auto Care", now - 2 * 3600000),
    makeBid("1-e", 12400, "Free rental car included", "Elite Repairs", now - 1 * 3600000),
  ],
  3: [
    makeBid("3-a", 4960, "Selected – work completed", "ABC Body Shop", now - 10 * 3600000),
    makeBid("3-b", 5200, "", "Quick Fix Auto", now - 9 * 3600000),
    makeBid("3-c", 5120, "", "Metro Collision", now - 8 * 3600000),
    makeBid("3-d", 5680, "", "Premium Auto Care", now - 7 * 3600000),
    makeBid("3-e", 5440, "", "Elite Repairs", now - 6 * 3600000),
    makeBid("3-f", 5280, "", "City Body Shop", now - 4 * 3600000),
    makeBid("3-g", 5520, "", "Downtown Auto", now - 3 * 3600000),
    makeBid("3-h", 5360, "", "Express Collision", now - 2 * 3600000),
  ],
};

/** Admin hangi teklifleri müşteriye gösterilecek seçer; anlaşma bitince kazanan teklif */
type RequestMeta = { visibleBidIds: string[]; winningBidAmount: number | null };
type RequestMetaState = Record<number, RequestMeta>;

export type BidWithRequest = { requestId: number; bid: Bid };

type BidsContextValue = {
  getBids: (requestId: number) => Bid[];
  getVisibleBids: (requestId: number) => Bid[];
  addBid: (requestId: number, amount: number, note: string, shopName?: string) => void;
  getBidsVisibleToCustomer: (requestId: number) => boolean;
  getVisibleBidIds: (requestId: number) => string[];
  setVisibleBidIds: (requestId: number, bidIds: string[]) => void;
  setBidsVisibleToCustomer: (requestId: number, visible: boolean) => void;
  getWinningBidAmount: (requestId: number) => number | null;
  setWinningBidAmount: (requestId: number, amount: number | null) => void;
  /** All bids from all requests, sorted by createdAt desc (newest first). For admin dashboard. */
  getLastBids: (count: number) => BidWithRequest[];
  /** Unique body shop names that have placed at least one bid. */
  getActiveBodyShopCount: () => number;
};

const BidsContext = createContext<BidsContextValue | null>(null);

const defaultMeta = (): RequestMeta => ({ visibleBidIds: [], winningBidAmount: null });

export function BidsProvider({ children }: { children: ReactNode }) {
  const [bidsByRequest, setBidsByRequest] = useState<BidsState>(() => ({ ...initialBids }));
  const [requestMeta, setRequestMeta] = useState<RequestMetaState>(() => ({}));

  const getBids = useCallback(
    (requestId: number) => bidsByRequest[requestId] ?? [],
    [bidsByRequest]
  );

  const getVisibleBidIds = useCallback(
    (requestId: number) => requestMeta[requestId]?.visibleBidIds ?? [],
    [requestMeta]
  );

  const getVisibleBids = useCallback(
    (requestId: number) => {
      const bids = bidsByRequest[requestId] ?? [];
      const visibleIds = requestMeta[requestId]?.visibleBidIds ?? [];
      return bids.filter((b) => visibleIds.includes(b.id));
    },
    [bidsByRequest, requestMeta]
  );

  const addBid = useCallback((requestId: number, amount: number, note: string, shopName?: string) => {
    const id = `${requestId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const createdAt = Date.now();
    setBidsByRequest((prev) => ({
      ...prev,
      [requestId]: [...(prev[requestId] ?? []), { id, amount, note, shopName, createdAt }],
    }));
  }, []);

  const getBidsVisibleToCustomer = useCallback(
    (requestId: number) => (requestMeta[requestId]?.visibleBidIds?.length ?? 0) > 0,
    [requestMeta]
  );

  const setVisibleBidIds = useCallback((requestId: number, bidIds: string[]) => {
    setRequestMeta((prev) => ({
      ...prev,
      [requestId]: { ...(prev[requestId] ?? defaultMeta()), visibleBidIds: bidIds },
    }));
  }, []);

  const setBidsVisibleToCustomer = useCallback(
    (requestId: number, visible: boolean) => {
      if (visible) {
        const bids = bidsByRequest[requestId] ?? [];
        setRequestMeta((prev) => ({
          ...prev,
          [requestId]: { ...(prev[requestId] ?? defaultMeta()), visibleBidIds: bids.map((b) => b.id) },
        }));
      } else {
        setRequestMeta((prev) => ({
          ...prev,
          [requestId]: { ...(prev[requestId] ?? defaultMeta()), visibleBidIds: [] },
        }));
      }
    },
    [bidsByRequest]
  );

  const getWinningBidAmount = useCallback(
    (requestId: number) => requestMeta[requestId]?.winningBidAmount ?? null,
    [requestMeta]
  );

  const setWinningBidAmount = useCallback((requestId: number, amount: number | null) => {
    setRequestMeta((prev) => ({
      ...prev,
      [requestId]: { ...(prev[requestId] ?? defaultMeta()), winningBidAmount: amount },
    }));
  }, []);

  const getLastBids = useCallback(
    (count: number): BidWithRequest[] => {
      const all: BidWithRequest[] = [];
      Object.entries(bidsByRequest).forEach(([requestIdStr, bids]) => {
        const requestId = Number(requestIdStr);
        bids.forEach((bid) => all.push({ requestId, bid }));
      });
      all.sort((a, b) => (b.bid.createdAt ?? 0) - (a.bid.createdAt ?? 0));
      return all.slice(0, count);
    },
    [bidsByRequest]
  );

  const getActiveBodyShopCount = useCallback(() => {
    const names = new Set<string>();
    Object.values(bidsByRequest).forEach((bids) => {
      bids.forEach((b) => {
        if (b.shopName) names.add(b.shopName);
      });
    });
    return names.size;
  }, [bidsByRequest]);

  return (
    <BidsContext.Provider
      value={{
        getBids,
        getVisibleBids,
        addBid,
        getBidsVisibleToCustomer,
        getVisibleBidIds,
        setVisibleBidIds,
        setBidsVisibleToCustomer,
        getWinningBidAmount,
        setWinningBidAmount,
        getLastBids,
        getActiveBodyShopCount,
      }}
    >
      {children}
    </BidsContext.Provider>
  );
}

export function useBids() {
  const ctx = useContext(BidsContext);
  if (!ctx) throw new Error("useBids must be used within BidsProvider");
  return ctx;
}
