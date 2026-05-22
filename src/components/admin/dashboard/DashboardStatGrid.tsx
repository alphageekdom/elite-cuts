import ChangePill from '@/components/admin/ChangePill';
import { formatMoney } from '@/lib/format';

type Stat = {
  label: string;
  value: string;
  valueSuffix?: string;
  change: number | null;
  changeMeta: string;
  icon: React.ReactNode;
  delay: string;
};

type Props = {
  currentRevenue: number;
  prevRevenue: number;
  currentOrders: number;
  prevOrders: number;
  currentNewCustomers: number;
  prevNewCustomers: number;
};

function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <div
      className="bg-paper rounded-sm px-5 md:px-6.5 py-6 border border-line-soft hover:-translate-y-0.5 transition-transform duration-400"
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

      <div className="font-display text-[40px] font-normal leading-none tracking-tight mb-3">
        {stat.value}
        {stat.valueSuffix && (
          <em className="italic text-oxblood text-[22px] ml-1">
            {stat.valueSuffix}
          </em>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
        {stat.change !== null ? <ChangePill val={stat.change} /> : null}
        <span className="whitespace-nowrap">{stat.changeMeta}</span>
      </div>
    </div>
  );
}

export default function DashboardStatGrid({
  currentRevenue, prevRevenue,
  currentOrders, prevOrders,
  currentNewCustomers, prevNewCustomers,
}: Props) {
  const revenueFormatted = currentRevenue > 0 ? formatMoney(currentRevenue) : '$0.00';
  const [revMain, revCents] = revenueFormatted.split('.');

  const currentAvg = currentOrders > 0 ? currentRevenue / currentOrders : 0;
  const prevAvg    = prevOrders > 0    ? prevRevenue / prevOrders : 0;
  const avgFormatted = currentAvg > 0 ? formatMoney(Math.round(currentAvg)) : '$0.00';
  const [avgMain, avgCents] = avgFormatted.split('.');

  const revChange  = pctChange(currentRevenue, prevRevenue);
  const ordChange  = pctChange(currentOrders, prevOrders);
  const custChange = pctChange(currentNewCustomers, prevNewCustomers);
  const avgChange  = pctChange(currentAvg, prevAvg);

  const stats: Stat[] = [
    {
      label: 'Revenue',
      value: revMain,
      valueSuffix: `.${revCents}`,
      change: revChange,
      changeMeta: revChange !== null ? 'vs prior 30 days' : 'no prior data',
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
      value: currentOrders.toLocaleString(),
      change: ordChange,
      changeMeta: ordChange !== null ? 'vs prior 30 days' : 'no prior data',
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
      label: 'New Customers',
      value: currentNewCustomers.toLocaleString(),
      change: custChange,
      changeMeta: custChange !== null ? 'vs prior 30 days' : 'no prior data',
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
      change: avgChange,
      changeMeta: avgChange !== null ? 'vs prior 30 days' : 'no prior data',
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
