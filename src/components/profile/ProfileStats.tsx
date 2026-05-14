import type { TierInfo } from '@/lib/rewards';

const fmt = (n: number) => n.toLocaleString('en-US');

function tierSubLabel(tier: TierInfo): string {
  if (tier.nextTier === null) return `${tier.label} reached`;
  const nextLabel = tier.nextTier === 'masterCut' ? 'Master Cut' : 'Connoisseur';
  return `${fmt(tier.pointsToNext)} to ${nextLabel}`;
}

type Props = {
  orderCount: number;
  totalSpent: number;
  savedCuts: number;
  joinedMonths: number;
  rewardPoints: number;
  tier: TierInfo;
};

export default function ProfileStats({ orderCount, totalSpent, savedCuts, joinedMonths, rewardPoints, tier }: Props) {
  const dollars = Math.floor(totalSpent);
  const cents = String(totalSpent.toFixed(2)).split('.')[1];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 mt-8 sm:mt-12 border-t border-line-soft divide-x divide-line-soft">
      <StatCell label="Orders placed" sub={`across ${joinedMonths} month${joinedMonths !== 1 ? 's' : ''}`} first>
        {orderCount}
      </StatCell>
      <StatCell label="Total spent" sub="all time">
        ${fmt(dollars)}
        <em className="not-italic text-oxblood text-lg ml-0.5">.{cents}</em>
      </StatCell>
      <StatCell label="Saved cuts" sub="cuts you've saved" mobileTopBorder>
        {savedCuts}
      </StatCell>
      <StatCell label="Reward points" sub={tierSubLabel(tier)} mobileTopBorder>
        {fmt(rewardPoints)}
      </StatCell>
    </div>
  );
}

type CellProps = {
  label: string;
  sub: string;
  children: React.ReactNode;
  first?: boolean;
  mobileTopBorder?: boolean;
};

function StatCell({ label, sub, children, first, mobileTopBorder }: CellProps) {
  return (
    <div className={`py-5 px-4 sm:py-6 sm:px-5 lg:py-8 lg:px-8 ${first ? 'pl-0' : ''} ${mobileTopBorder ? 'border-t border-line-soft lg:border-t-0' : ''}`}>
      <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-muted mb-3">{label}</p>
      <p className="font-display text-[32px] font-normal leading-none tracking-tight">{children}</p>
      <p className="text-xs text-muted mt-1.5">{sub}</p>
    </div>
  );
}
