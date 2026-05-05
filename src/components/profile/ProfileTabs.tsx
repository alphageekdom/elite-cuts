import Link from 'next/link';

type Tab = {
  id: string;
  label: string;
  href: string;
};

const TABS: Tab[] = [
  { id: 'overview',  label: 'Overview',    href: '/profile' },
  { id: 'orders',    label: 'Orders',      href: '/profile?tab=orders' },
  { id: 'saved',     label: 'Saved cuts',  href: '/profile?tab=saved' },
  { id: 'addresses', label: 'Addresses',   href: '/profile?tab=addresses' },
  { id: 'settings',  label: 'Settings',    href: '/profile?tab=settings' },
];

type Props = {
  activeTab: string;
  orderCount: number;
  savedCount: number;
  addressCount: number;
};

export default function ProfileTabs({ activeTab, orderCount, savedCount, addressCount }: Props) {
  function badge(id: string): number | null {
    if (id === 'orders') return orderCount || null;
    if (id === 'saved') return savedCount || null;
    if (id === 'addresses') return addressCount || null;
    return null;
  }

  return (
    <nav aria-label="Profile sections" className="mt-12 border-b border-line-soft relative -mx-5 md:mx-0">
      {/* Fade hint — signals more tabs off-screen on mobile */}
      <div className="absolute right-0 top-0 bottom-0 w-10 bg-linear-to-l from-cream to-transparent pointer-events-none md:hidden z-10" />
      <ul className="flex gap-4 md:gap-8 overflow-x-auto px-5 md:px-0 pr-10 md:pr-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {TABS.map(({ id, label, href }) => {
          const isActive = activeTab === id;
          const count = badge(id);

          return (
            <li key={id} className="-mb-px shrink-0">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-1.5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2 focus-visible:ring-offset-cream rounded-sm
                  ${isActive
                    ? 'text-ink border-oxblood'
                    : 'text-muted border-transparent hover:text-ink hover:border-line'
                  }`}
              >
                {label}
                {count !== null && (
                  <span
                    aria-label={`${count} ${label.toLowerCase()}`}
                    className={`text-[11px] px-2 py-0.5 rounded-full tracking-[0.02em] tabular-nums ${isActive ? 'bg-ink text-cream' : 'bg-cream-deep text-ink-soft'}`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
