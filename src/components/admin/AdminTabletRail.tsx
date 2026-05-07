'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GiMeatCleaver } from 'react-icons/gi';
import { NAV_WORKSPACE, NAV_OPERATIONS } from './navItems';

type Props = {
  initial: string;
  criticalInventoryCount: number;
};

export default function AdminTabletRail({ initial, criticalInventoryCount }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const linkCls = (href: string) =>
    [
      'flex justify-center items-center rounded-lg py-2.5 min-h-11 transition-colors w-full',
      isActive(href) ? 'bg-oxblood text-cream' : 'text-cream/75 hover:bg-cream/8 hover:text-cream',
    ].join(' ');

  return (
    <aside
      className="hidden md:flex lg:hidden flex-col bg-ink text-cream sticky top-0 h-screen w-16 shrink-0"
      aria-label="Admin navigation"
    >
      {/* Logo */}
      <div className="pt-5 pb-4 flex justify-center shrink-0">
        <Link
          href="/"
          className="w-9 h-9 rounded-full bg-oxblood grid place-items-center hover:opacity-90 transition-opacity"
          aria-label="EliteCuts home"
        >
          <GiMeatCleaver className="text-xl text-cream" aria-hidden="true" />
        </Link>
      </div>

      <div className="h-px bg-cream/15 mx-3 mb-2 shrink-0" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 flex flex-col gap-4 pt-2" aria-label="Admin pages">
        {/* Workspace */}
        <ul className="flex flex-col gap-0.5" role="list">
          {NAV_WORKSPACE.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={linkCls(item.href)}
                title={item.label}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <span className="opacity-85 shrink-0">
                  <item.Icon />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="h-px bg-cream/15 mx-2 shrink-0" />

        {/* Operations */}
        <ul className="flex flex-col gap-0.5" role="list">
          {NAV_OPERATIONS.map((item) => {
            const isInventory = item.href === '/dashboard/inventory';
            const showBadge = isInventory && criticalInventoryCount > 0;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={linkCls(item.href)}
                  title={item.label}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <span className="relative opacity-85 shrink-0">
                    <item.Icon />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-oxblood border border-cream/30" />
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User avatar */}
      <div className="h-px bg-cream/15 mx-3 shrink-0" />
      <div className="py-4 flex justify-center shrink-0">
        <div className="w-9 h-9 rounded-full bg-camel text-ink grid place-items-center font-display font-semibold text-sm shrink-0">
          {initial}
        </div>
      </div>
    </aside>
  );
}
