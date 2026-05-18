// Pure tier / activity helpers. Lives in lib/ so server routes (CSV export,
// page aggregators) can import without reaching into a components/ tree.
// `customerUtils.ts` re-exports these alongside its UI-specific config so
// existing client imports keep resolving without churn.

export type Tier = 'master' | 'connoisseur' | 'regular';
export type ActivityStatus = 'active' | 'dormant' | 'at-risk' | 'new';

type CustomerActivityInput = {
  createdAt: string;
  lastOrderAt?: string;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export function getTier(orderCount: number): Tier {
  if (orderCount >= 20) return 'master';
  if (orderCount >= 10) return 'connoisseur';
  return 'regular';
}

export function getActivity(row: CustomerActivityInput): ActivityStatus {
  const now = Date.now();
  const accountAge = now - new Date(row.createdAt).getTime();
  if (accountAge < THIRTY_DAYS_MS) return 'new';
  if (!row.lastOrderAt) return 'at-risk';
  const lastOrderAge = now - new Date(row.lastOrderAt).getTime();
  if (lastOrderAge <= THIRTY_DAYS_MS) return 'active';
  if (lastOrderAge <= NINETY_DAYS_MS) return 'dormant';
  return 'at-risk';
}
