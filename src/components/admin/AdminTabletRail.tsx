'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GiMeatCleaver } from 'react-icons/gi';
import { NAV_WORKSPACE, NAV_OPERATIONS } from './navItems';
import AdminUserMenu from './AdminUserMenu';

type Props = {
  name: string;
  initial: string;
  criticalInventoryCount: number;
  openMessageCount?: number;
};

export default function AdminTabletRail({ name, initial, criticalInventoryCount, openMessageCount = 0 }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const linkCls = (href: string) =>
    [
      'flex justify-center items-center rounded-lg py-2 min-h-[38px] transition-colors w-full',
      isActive(href) ? 'bg-oxblood text-cream' : 'text-cream/75 hover:bg-cream/8 hover:text-cream',
    ].join(' ');

  return (
    <aside
      // `scheme-dark scrollbar-ink` for the same reason as the desktop sidebar:
      // this rail is the same dark nav at tablet width and its icon list
      // scrolls, so without them the scrollbar renders light against `bg-ink`,
      // then dark grey rather than in the rail's own colour.
      className="scheme-dark scrollbar-ink hidden md:flex lg:hidden flex-col bg-ink text-cream sticky top-0 h-screen w-16 shrink-0"
      aria-label="Admin navigation"
    >
      {/* Logo */}
      <div className="pt-4 pb-3 flex justify-center shrink-0">
        <Link
          href="/"
          className="w-9 h-9 rounded-full bg-oxblood grid place-items-center hover:opacity-90 transition-opacity"
          aria-label="EliteCuts home"
        >
          <GiMeatCleaver className="text-xl text-cream" aria-hidden="true" />
        </Link>
      </div>

      <div className="h-px bg-cream/15 mx-3 mb-1 shrink-0" />

      {/* Nav — relative wrapper so the scroll-hint gradient overlays correctly */}
      <div className="relative flex-1 min-h-0">
        <nav className="h-full overflow-y-auto px-2 flex flex-col gap-2" aria-label="Admin pages">
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
              const isMessages  = item.href === '/dashboard/messages';
              const showBadge   = (isInventory && criticalInventoryCount > 0) || (isMessages && (openMessageCount ?? 0) > 0);
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
        {/* Scroll-hint: fades to ink so users know more icons sit below */}
        <div
          className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-ink to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* User avatar — the same menu the desktop sidebar uses, in its
          avatar-only mode, which is already this rail's shape.
          Without it this 768–1023px band had no sign-out at all: it is the one
          surface with neither a "more" sheet nor a sidebar user card, so an
          iPad in portrait or any phone held sideways could not end its session
          without leaving the admin shell. The avatar here was a plain div. */}
      <div className="h-px bg-cream/15 mx-3 shrink-0" />
      <div className="py-3 px-2 shrink-0">
        <AdminUserMenu name={name} initial={initial} collapsed />
      </div>
    </aside>
  );
}
