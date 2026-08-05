import React from 'react';
import ClockIcon from '@/components/ui/icons/ClockIcon';

export type NavItem = {
  href: string;
  label: string;
  group: 'workspace' | 'operations';
  mobilePrimary: boolean;
  Icon: React.ComponentType<{ className?: string }>;
};

const DashboardIcon = ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
  </svg>
);

const OrdersIcon = ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

const ProductsIcon = ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const PromosIcon = ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

const CustomersIcon = ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const AnalyticsIcon = ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const InventoryIcon = ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14H7L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

const ScheduleIcon = ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
  <ClockIcon className={className} />
);

const StaffIcon = ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 11l-3 3-2-2" />
  </svg>
);

const MessagesIcon = ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const SettingsIcon = ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',            label: 'Dashboard', group: 'workspace',  mobilePrimary: true,  Icon: DashboardIcon },
  { href: '/dashboard/orders',     label: 'Orders',    group: 'workspace',  mobilePrimary: true,  Icon: OrdersIcon },
  { href: '/dashboard/products',   label: 'Products',  group: 'workspace',  mobilePrimary: true,  Icon: ProductsIcon },
  { href: '/dashboard/promos',     label: 'Promos',    group: 'workspace',  mobilePrimary: false, Icon: PromosIcon },
  { href: '/dashboard/customers',  label: 'Customers', group: 'workspace',  mobilePrimary: false, Icon: CustomersIcon },
  { href: '/dashboard/analytics',  label: 'Analytics', group: 'workspace',  mobilePrimary: false, Icon: AnalyticsIcon },
  { href: '/dashboard/inventory',  label: 'Inventory', group: 'operations', mobilePrimary: true,  Icon: InventoryIcon },
  { href: '/dashboard/messages',   label: 'Messages',  group: 'operations', mobilePrimary: false, Icon: MessagesIcon },
  { href: '/dashboard/schedule',   label: 'Schedule',  group: 'operations', mobilePrimary: false, Icon: ScheduleIcon },
  { href: '/dashboard/staff',      label: 'Staff',     group: 'operations', mobilePrimary: false, Icon: StaffIcon },
  { href: '/dashboard/settings',   label: 'Settings',  group: 'operations', mobilePrimary: false, Icon: SettingsIcon },
];

export const NAV_WORKSPACE  = NAV_ITEMS.filter((i) => i.group === 'workspace');
export const NAV_OPERATIONS = NAV_ITEMS.filter((i) => i.group === 'operations');
export const MOBILE_MORE    = NAV_ITEMS.filter((i) => !i.mobilePrimary);

// Mobile bottom-nav order: Dashboard → Products → Orders → Inventory
const MOBILE_ORDER = ['/dashboard', '/dashboard/products', '/dashboard/orders', '/dashboard/inventory'];
export const MOBILE_PRIMARY = NAV_ITEMS
  .filter((i) => i.mobilePrimary)
  .sort((a, b) => MOBILE_ORDER.indexOf(a.href) - MOBILE_ORDER.indexOf(b.href));
