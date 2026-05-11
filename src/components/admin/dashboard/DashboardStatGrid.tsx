import { formatMoney } from '@/lib/admin-utils';

type Stat = {
  label: string;
  value: string;
  valueSuffix?: string;
  change: string;
  changeDir: 'up' | 'down';
  changeMeta: string;
  icon: React.ReactNode;
  delay: string;
};

type Props = {
  revenue: number;
  orders: number;
  customers: number;
  avgOrder: number;
  currentMonthRevenue: number;
  prevMonthRevenue: number;
  currentMonthOrders: number;
  prevMonthOrders: number;
  currentMonthCustomers: number;
  prevMonthCustomers: number;
};

function pctChange(current: number, prev: number): { label: string; dir: 'up' | 'down' } | null {
  if (prev === 0) return null;
  const pct = ((current - prev) / prev) * 100;
  return {
    label: `${Math.abs(pct).toFixed(1)}%`,
    dir: pct >= 0 ? 'up' : 'down',
  };
}

function countChange(current: number, prev: number): { label: string; dir: 'up' | 'down' } | null {
  if (prev === 0 && current === 0) return null;
  const diff = current - prev;
  return {
    label: diff >= 0 ? `+${diff} new` : `${diff} new`,
    dir: diff >= 0 ? 'up' : 'down',
  };
}

function StatCard({ stat }: { stat: Stat }) {
  const ArrowUp = () => (
    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
  const ArrowDown = () => (
    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  return (
    <div
      className="bg-paper rounded-[4px] px-5 md:px-6.5 py-6 border border-line-soft hover:-translate-y-0.5 transition-transform duration-400"
      style={{
        animation: `dashStatRise 0.8s cubic-bezier(0.2,0.8,0.2,1) ${stat.delay} both`,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-5">
        <span className="text-[11px] font-medium tracking-[0.22em] uppercase text-muted leading-tight">
          {stat.label}
        </span>
        <span className="w-8 h-8 rounded-full bg-cream-deep text-ink-soft grid place-items-center shrink-0">
          {stat.icon}
        </span>
      </div>

      <div className="font-display text-[40px] font-normal leading-none tracking-[-0.025em] mb-3">
        {stat.value}
        {stat.valueSuffix && (
          <em className="italic text-oxblood text-[22px] ml-1">
            {stat.valueSuffix}
          </em>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
        {stat.change !== '—' ? (
          <span
            className={`inline-flex items-center gap-[3px] px-2 py-0.5 rounded-full font-medium text-[11px] tracking-[0.02em] ${
              stat.changeDir === 'up'
                ? 'bg-green-soft text-green'
                : 'bg-red-soft text-oxblood'
            }`}
          >
            {stat.changeDir === 'up' ? <ArrowUp /> : <ArrowDown />}
            {stat.change}
          </span>
        ) : null}
        <span className="whitespace-nowrap">{stat.changeMeta}</span>
      </div>
    </div>
  );
}

export default function DashboardStatGrid({
  revenue, orders, customers, avgOrder,
  currentMonthRevenue, prevMonthRevenue,
  currentMonthOrders, prevMonthOrders,
  currentMonthCustomers, prevMonthCustomers,
}: Props) {
  const revenueFormatted = revenue > 0 ? formatMoney(revenue) : '$0.00';
  const [revMain, revCents] = revenueFormatted.split('.');
  const avgFormatted = avgOrder > 0 ? formatMoney(avgOrder) : '$0.00';
  const [avgMain, avgCents] = avgFormatted.split('.');

  const currentMonthAvg = currentMonthOrders > 0 ? currentMonthRevenue / currentMonthOrders : 0;
  const prevMonthAvg    = prevMonthOrders > 0    ? prevMonthRevenue / prevMonthOrders : 0;

  const revChange  = pctChange(currentMonthRevenue, prevMonthRevenue);
  const ordChange  = pctChange(currentMonthOrders, prevMonthOrders);
  const custChange = countChange(currentMonthCustomers, prevMonthCustomers);
  const avgChange  = pctChange(currentMonthAvg, prevMonthAvg);

  const stats: Stat[] = [
    {
      label: 'Revenue',
      value: revMain,
      valueSuffix: `.${revCents}`,
      change: revChange?.label ?? '—',
      changeDir: revChange?.dir ?? 'up',
      changeMeta: revChange ? 'vs last month' : 'no prior data',
      delay: '0.05s',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
    {
      label: 'Orders',
      value: orders.toLocaleString(),
      change: ordChange?.label ?? '—',
      changeDir: ordChange?.dir ?? 'up',
      changeMeta: ordChange ? 'vs last month' : 'no prior data',
      delay: '0.12s',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      ),
    },
    {
      label: 'Customers',
      value: customers.toLocaleString(),
      change: custChange?.label ?? '—',
      changeDir: custChange?.dir ?? 'up',
      changeMeta: custChange ? 'vs last month' : 'no prior data',
      delay: '0.19s',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
    {
      label: 'Avg. Order',
      value: avgMain,
      valueSuffix: `.${avgCents}`,
      change: avgChange?.label ?? '—',
      changeDir: avgChange?.dir ?? 'up',
      changeMeta: avgChange ? 'vs last month' : 'no prior data',
      delay: '0.26s',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </div>
  );
}
