'use client';
import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { GiMeatCleaver } from 'react-icons/gi';
import AdminNavLinks from './AdminNavLinks';

type Props = {
  name: string;
  initial: string;
  criticalInventoryCount: number;
  openMessageCount: number;
};

// Sidebar collapsed flag lives in localStorage so it survives navigation and
// stays consistent across admin tabs. A module-level subscriber set notifies
// React readers via useSyncExternalStore — the SSR snapshot returns false to
// match the server, then the client snapshot reads the actual stored value
// after hydration.
const COLLAPSED_KEY = 'admin-sidebar-collapsed';
const collapsedListeners = new Set<() => void>();
const subscribeCollapsed = (listener: () => void) => {
  collapsedListeners.add(listener);
  return () => {
    collapsedListeners.delete(listener);
  };
};
const getCollapsedSnapshot = () =>
  window.localStorage.getItem(COLLAPSED_KEY) === 'true';
const getCollapsedServerSnapshot = () => false;
const writeCollapsed = (value: boolean) => {
  window.localStorage.setItem(COLLAPSED_KEY, String(value));
  collapsedListeners.forEach((l) => l());
};

export default function AdminSidebarClient({ name, initial, criticalInventoryCount, openMessageCount }: Props) {
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );

  function toggle() {
    writeCollapsed(!collapsed);
  }

  return (
    // `scheme-dark` sets `color-scheme: dark`, which is what makes the browser
    // paint the nav's scrollbar dark instead of in its light default — a white
    // bar down an almost-black panel, visible whenever the window is short
    // enough for the links to overflow. `scrollbar-ink` then takes the track
    // from the browser's generic dark grey to the nav's own `bg-ink`. Both
    // inherit, so one pair here covers the scrolling div below, and the sidebar
    // has no form controls for the dark scheme to restyle unintentionally.
    <aside
      className={`scheme-dark scrollbar-ink hidden lg:flex flex-col bg-ink text-cream sticky top-0 h-screen shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand */}
      <div className={`shrink-0 py-5 flex flex-col gap-1 ${collapsed ? 'items-center px-0' : 'px-6'}`}>
        {/* Mark, wordmark and toggle share a row when expanded, and stack when
            collapsed so the toggle sits under the mark.
            The toggle holds the SAME place in the DOM in both states — only the
            flex direction changes. Moving it between parents would unmount and
            remount it, so a keyboard user who pressed it would lose focus every
            time they collapsed or expanded. */}
        <div className={`flex gap-3 ${collapsed ? 'flex-col items-center' : 'items-center'}`}>
          <Link
            href="/"
            // Named explicitly because the wordmark unmounts when collapsed,
            // leaving the link holding nothing but an `aria-hidden` icon — a
            // screen reader announced a bare "link". Unconditional rather than
            // collapsed-only: it matches the tablet rail's identical link, and
            // the name still contains the visible "EliteCuts" when expanded.
            aria-label="EliteCuts home"
            className="flex items-center gap-3 font-display font-semibold tracking-tight text-cream hover:opacity-90 transition-opacity overflow-hidden rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-camel"
          >
            <span className="w-9 h-9 rounded-full bg-oxblood grid place-items-center shrink-0">
              <GiMeatCleaver className="text-xl text-cream" aria-hidden="true" />
            </span>
            {!collapsed && (
              <span className="text-[22px] whitespace-nowrap">EliteCuts</span>
            )}
          </Link>
          <button
            onClick={toggle}
            // The label swap alone doesn't announce the result: a name change
            // on the already-focused element the user just pressed is not
            // reliably re-read, so pressing it appeared to do nothing.
            // `aria-expanded` is a state change, which is announced.
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-7 h-7 rounded-full grid place-items-center text-cream/60 hover:text-cream hover:bg-cream/10 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-camel ${
              collapsed ? '' : 'ml-auto'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {collapsed
                ? <polyline points="9 18 15 12 9 6" />
                : <polyline points="15 18 9 12 15 6" />
              }
            </svg>
          </button>
        </div>

        {!collapsed && (
          <div className="text-[10px] tracking-[0.22em] uppercase text-camel ml-12">
            Admin
          </div>
        )}
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
