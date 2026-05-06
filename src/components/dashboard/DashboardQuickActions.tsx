import Link from 'next/link';

type Action = {
  href: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
};

const ACTIONS: Action[] = [
  {
    href: '/products/add',
    label: 'Add a product',
    desc: 'List a new cut in the shop',
    icon: (
      <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
  {
    href: '/products/list',
    label: 'Manage inventory',
    desc: 'Update stock and pricing',
    icon: (
      <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-2 14H7L5 6" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    ),
  },
  {
    href: '/dashboard/reports',
    label: 'Export reports',
    desc: 'Sales, inventory, customers',
    icon: (
      <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
];

export default function DashboardQuickActions() {
  return (
    <div className="grid grid-cols-3 gap-4 mb-4">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="bg-paper border border-line-soft rounded-[4px] px-6 py-[22px] flex items-center gap-4 hover:border-ink hover:-translate-y-0.5 transition-all duration-400 group"
        >
          <span className="w-11 h-11 rounded-full bg-ink text-cream grid place-items-center shrink-0 group-hover:bg-oxblood transition-colors">
            {action.icon}
          </span>
          <span>
            <div className="font-display text-[16px] font-medium tracking-[-0.01em] mb-0.5">
              {action.label}
            </div>
            <div className="text-[12px] text-muted">{action.desc}</div>
          </span>
        </Link>
      ))}
    </div>
  );
}
