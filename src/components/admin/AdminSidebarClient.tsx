'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GiMeatCleaver } from 'react-icons/gi';
import AdminNavLinks from './AdminNavLinks';

type Props = {
  name: string;
  initial: string;
  criticalInventoryCount: number;
  openMessageCount: number;
};

export default function AdminSidebarClient({ name, initial, criticalInventoryCount, openMessageCount }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    if (localStorage.getItem('admin-sidebar-collapsed') === 'true') {
      setCollapsed(true);
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin-sidebar-collapsed', String(next));
      return next;
    });
  }

  return (
    <aside
      className={`hidden lg:flex flex-col bg-ink text-cream sticky top-0 h-screen shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand */}
      <div className={`shrink-0 pt-5 pb-5 flex flex-col gap-4 ${collapsed ? 'items-center px-0' : 'px-6'}`}>
        {/* Toggle — always at the top, same position in both states */}
        <div className={`flex w-full ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-7 h-7 rounded-full grid place-items-center text-cream/60 hover:text-cream hover:bg-cream/10 transition-colors shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {collapsed
                ? <polyline points="9 18 15 12 9 6" />
                : <polyline points="15 18 9 12 15 6" />
              }
            </svg>
          </button>
        </div>

        {/* Logo */}
        <div className={`flex flex-col ${collapsed ? 'items-center gap-0' : 'gap-1'}`}>
          <Link
            href="/"
            className="flex items-center gap-3 font-display font-semibold tracking-tight text-cream hover:opacity-90 transition-opacity overflow-hidden"
          >
            <span className="w-9 h-9 rounded-full bg-oxblood grid place-items-center shrink-0">
              <GiMeatCleaver className="text-xl text-cream" aria-hidden="true" />
            </span>
            {!collapsed && (
              <span className="text-[22px] whitespace-nowrap">EliteCuts</span>
            )}
          </Link>
          {!collapsed && (
            <div className="text-[10px] tracking-[0.22em] uppercase text-camel ml-12">
              Admin
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-cream/15 mx-3 my-1 shrink-0" />

      {/* Nav */}
      <div className={`flex-1 overflow-y-auto pt-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        <AdminNavLinks
          criticalInventoryCount={criticalInventoryCount}
          openMessageCount={openMessageCount}
          collapsed={collapsed}
        />
      </div>

      {/* User card */}
      <div className="h-px bg-cream/15 mx-3 my-1 shrink-0" />
      <div className={`pt-3 pb-5 ${collapsed ? 'px-2' : 'px-4'}`}>
        <div
          className={`flex items-center gap-2.5 p-2 rounded-lg hover:bg-cream/8 transition-colors cursor-pointer ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-camel text-ink grid place-items-center font-display font-semibold text-sm shrink-0">
            {initial}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-cream truncate">{name}</div>
              <div className="text-[11px] text-cream/55 tracking-[0.06em] uppercase">Admin</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
