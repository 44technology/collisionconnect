/**
 * Submitted requests by reference ID (client-side until Firestore).
 * Body shop quote link: /quote/REF_ID
 */

export type SubmittedRequest = {
  refId: string;
  vehicle: string;
  make: string;
  model: string;
  trim: string;
  year: string;
  damage: string;
  zipCode: string;
  desiredTimeframe: string;
  additionalNotes: string;
  createdAt: string;
  imageUrls: string[];
  imageLabels: string[];
};

const STORAGE_KEY = "collision_submitted_requests";

function load(): Map<string, SubmittedRequest> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as SubmittedRequest[];
      return new Map(arr.map((r) => [r.refId, r]));
    }
  } catch (_) {}
  return new Map();
}

function save(map: Map<string, SubmittedRequest>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...map.values()]));
  } catch (_) {}
}

export function generateRefId(): string {
  const part = () =>
    Math.random().toString(36).replace(/[^a-z0-9]/g, "").toUpperCase().slice(0, 4);
  return `CC-${part()}-${part()}`;
}

export function addSubmittedRequest(data: Omit<SubmittedRequest, "refId" | "createdAt">): string {
  const refId = generateRefId();
  const map = load();
  map.set(refId, {
    ...data,
    refId,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  save(map);
  return refId;
}

export function getSubmittedRequestByRefId(refId: string): SubmittedRequest | undefined {
  return load().get(refId);
}

/** RefId format: CC-XXXX-YYYY (used in quote links and Firestore doc ids) */
export function isRefId(id: string): boolean {
  return /^CC-[A-Z0-9]+-[A-Z0-9]+$/i.test(id);
}

export function getAllSubmittedRequests(): SubmittedRequest[] {
  return [...load().values()];
}
