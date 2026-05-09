'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_WORKSPACE, NAV_OPERATIONS } from './navItems';

type Props = {
  criticalInventoryCount?: number;
  openMessageCount?: number;
  collapsed?: boolean;
};

export default function AdminNavLinks({ criticalInventoryCount, openMessageCount, collapsed }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const linkCls = (href: string) =>
    [
      'flex items-center rounded-lg text-sm transition-colors w-full min-h-11',
      collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5',
      isActive(href) ? 'bg-oxblood text-cream' : 'text-cream/75 hover:bg-cream/8 hover:text-cream',
    ].join(' ');

  return (
    <>
      {/* Workspace */}
      <div className="mb-6">
        {!collapsed && (
          <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-cream/50 mb-3.5 px-3">
            Workspace
          </div>
        )}
        <ul className="flex flex-col gap-0.5">
          {NAV_WORKSPACE.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={linkCls(item.href)}
                title={collapsed ? item.label : undefined}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <span className="opacity-85 shrink-0">
                  <item.Icon />
                </span>
                {!collapsed && item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Divider — collapsed only */}
      {collapsed && <div className="my-2 mx-2 h-px bg-cream/15" />}

      {/* Operations */}
      <div>
        {!collapsed && (
          <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-cream/50 mb-3.5 px-3 mt-2">
            Operations
          </div>
        )}
        <ul className="flex flex-col gap-0.5">
          {NAV_OPERATIONS.map((item) => {
            const isInventory = item.href === '/dashboard/inventory';
            const isMessages  = item.href === '/dashboard/messages';
            const showInventoryBadge = isInventory && criticalInventoryCount && criticalInventoryCount > 0;
            const showMessageBadge   = isMessages  && openMessageCount       && openMessageCount > 0;
            const showBadge = showInventoryBadge || showMessageBadge;
            const badgeCount = showInventoryBadge ? criticalInventoryCount : openMessageCount;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={linkCls(item.href)}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <span className="relative opacity-85 shrink-0">
                    <item.Icon />
                    {collapsed && showBadge && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-oxblood border border-ink" />
                    )}
                  </span>
                  {!collapsed && item.label}
                  {!collapsed && showBadge && (
                    <span className="ml-auto bg-oxblood text-cream text-[10px] font-semibold px-1.5 py-0.5 rounded-full tracking-[0.04em]">
                      {badgeCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
