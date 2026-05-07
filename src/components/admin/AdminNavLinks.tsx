'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Props = {
  criticalInventoryCount?: number;
};

const NAV_WORKSPACE = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    badge: null as string | null,
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
  {
    href: '/dashboard/orders',
    label: 'Orders',
    badge: null as string | null,
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
  },
  {
    href: '/dashboard/products',
    label: 'Products',
    badge: null as string | null,
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    href: '/dashboard/customers',
    label: 'Customers',
    badge: null as string | null,
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    badge: null as string | null,
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

const NAV_OPERATIONS = [
  {
    href: '/dashboard/inventory',
    label: 'Inventory',
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14H7L5 6" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    ),
  },
  {
    href: '/dashboard/schedule',
    label: 'Schedule',
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

export default function AdminNavLinks({ criticalInventoryCount }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <>
      {/* Workspace */}
      <div className="mb-8">
        <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-cream/40 mb-3.5 px-3">
          Workspace
        </div>
        <ul className="flex flex-col gap-0.5">
          {NAV_WORKSPACE.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive(item.href)
                    ? 'bg-oxblood text-cream'
                    : 'text-cream/75 hover:bg-cream/5 hover:text-cream'
                }`}
              >
                <span className="opacity-85">{item.icon}</span>
                {item.label}
                {item.badge && (
                  <span className="ml-auto bg-camel text-ink text-[10px] font-semibold px-1.5 py-0.5 rounded-full tracking-[0.04em]">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Operations */}
      <div>
        <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-cream/40 mb-3.5 px-3">
          Operations
        </div>
        <ul className="flex flex-col gap-0.5">
          {NAV_OPERATIONS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive(item.href)
                    ? 'bg-oxblood text-cream'
                    : 'text-cream/75 hover:bg-cream/5 hover:text-cream'
                }`}
              >
                <span className="opacity-85">{item.icon}</span>
                {item.label}
                {item.href === '/dashboard/inventory' && criticalInventoryCount && criticalInventoryCount > 0 ? (
                  <span className="ml-auto bg-oxblood text-cream text-[10px] font-semibold px-1.5 py-0.5 rounded-full tracking-[0.04em]">
                    {criticalInventoryCount}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
