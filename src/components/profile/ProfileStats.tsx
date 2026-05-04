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
    <div className="grid grid-cols-2 lg:grid-cols-4 mt-12 pt-9 border-t border-line-soft">
      <StatCell position="first" label="Orders placed" sub={`across ${joinedMonths} month${joinedMonths !== 1 ? 's' : ''}`}>
        {orderCount}
      </StatCell>
      <StatCell position="middle" label="Total spent" sub="lifetime value">
        ${dollars}
        <em className="not-italic text-oxblood text-lg ml-0.5">.{cents}</em>
      </StatCell>
      <StatCell position="middle" label="Saved cuts" sub="favorites & wishlist">
        {savedCuts}
      </StatCell>
      <StatCell position="last" label="Reward points" sub={`${NEXT_TIER_POINTS - REWARD_POINTS} to Master tier`}>
        {REWARD_POINTS}
      </StatCell>
    </div>
  );
}

type CellProps = {
  position: 'first' | 'middle' | 'last';
  label: string;
  sub: string;
  children: React.ReactNode;
};

function StatCell({ position, label, sub, children }: CellProps) {
  const padding =
    position === 'first'
      ? 'lg:pr-8'
      : position === 'last'
        ? 'lg:pl-8 lg:border-l lg:border-line-soft'
        : 'lg:px-8 lg:border-l lg:border-line-soft';

  return (
    <div className={`py-6 lg:py-0 ${padding} ${position !== 'last' && position !== 'middle' ? '' : ''}`}>
      <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-muted mb-3">{label}</p>
      <p className="font-display text-[32px] font-normal leading-none tracking-tight">{children}</p>
      <p className="text-xs text-muted mt-1.5">{sub}</p>
    </div>
  );
}
