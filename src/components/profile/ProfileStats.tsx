type Props = {
  orderCount: number;
  totalSpent: number;
  savedCuts: number;
  joinedMonths: number;
};

const REWARD_POINTS = 680;
const NEXT_TIER_POINTS = 1000;

export default function ProfileStats({ orderCount, totalSpent, savedCuts, joinedMonths }: Props) {
  const dollars = Math.floor(totalSpent);
  const cents = String(totalSpent.toFixed(2)).split('.')[1];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 mt-12 border-t border-line-soft divide-x divide-line-soft">
      <StatCell label="Orders placed" sub={`across ${joinedMonths} month${joinedMonths !== 1 ? 's' : ''}`} first>
        {orderCount}
      </StatCell>
      <StatCell label="Total spent" sub="lifetime value">
        ${dollars}
        <em className="not-italic text-oxblood text-lg ml-0.5">.{cents}</em>
      </StatCell>
      <StatCell label="Saved cuts" sub="favorites & wishlist" mobileTopBorder>
        {savedCuts}
      </StatCell>
      <StatCell label="Reward points" sub={`${NEXT_TIER_POINTS - REWARD_POINTS} to Master tier`} mobileTopBorder>
        {REWARD_POINTS}
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
    <div className={`py-6 px-5 lg:py-8 lg:px-8 ${first ? 'lg:pl-0' : ''} ${mobileTopBorder ? 'border-t border-line-soft lg:border-t-0' : ''}`}>
      <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-muted mb-3">{label}</p>
      <p className="font-display text-[32px] font-normal leading-none tracking-tight">{children}</p>
      <p className="text-xs text-muted mt-1.5">{sub}</p>
    </div>
  );
}
