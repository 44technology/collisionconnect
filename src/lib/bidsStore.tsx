import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

/** Body shop receives this amount; customer sees amount / (1 - commission) = amount / 0.8 */
export const COMMISSION_RATE = 0.2; // 20%

export function shopAmountToCustomerPrice(shopAmount: number): number {
  return Math.round(shopAmount / (1 - COMMISSION_RATE));
}

export type Bid = { id: string; amount: number; note: string };

type BidsState = Record<number, Bid[]>;

function makeBid(id: string, amount: number, note: string): Bid {
  return { id, amount, note };
}

const initialBids: BidsState = {
  1: [
    makeBid("1-a", 11600, "Includes OEM parts, 2-year warranty"),
    makeBid("1-b", 12160, "Aftermarket parts, 1-week turnaround"),
    makeBid("1-c", 11840, "OEM parts available on request"),
    makeBid("1-d", 12960, "Premium paint, lifetime warranty"),
    makeBid("1-e", 12400, "Free rental car included"),
  ],
  3: [
    makeBid("3-a", 4960, "Selected – work completed"),
    makeBid("3-b", 5200, ""),
    makeBid("3-c", 5120, ""),
    makeBid("3-d", 5680, ""),
    makeBid("3-e", 5440, ""),
    makeBid("3-f", 5280, ""),
    makeBid("3-g", 5520, ""),
    makeBid("3-h", 5360, ""),
  ],
};

/** Admin hangi teklifleri müşteriye gösterilecek seçer; anlaşma bitince kazanan teklif */
type RequestMeta = { visibleBidIds: string[]; winningBidAmount: number | null };
type RequestMetaState = Record<number, RequestMeta>;

type BidsContextValue = {
  getBids: (requestId: number) => Bid[];
  getVisibleBids: (requestId: number) => Bid[];
  addBid: (requestId: number, amount: number, note: string) => void;
  getBidsVisibleToCustomer: (requestId: number) => boolean;
  getVisibleBidIds: (requestId: number) => string[];
  setVisibleBidIds: (requestId: number, bidIds: string[]) => void;
  setBidsVisibleToCustomer: (requestId: number, visible: boolean) => void;
  getWinningBidAmount: (requestId: number) => number | null;
  setWinningBidAmount: (requestId: number, amount: number | null) => void;
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

  const addBid = useCallback((requestId: number, amount: number, note: string) => {
    const id = `${requestId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setBidsByRequest((prev) => ({
      ...prev,
      [requestId]: [...(prev[requestId] ?? []), { id, amount, note }],
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
