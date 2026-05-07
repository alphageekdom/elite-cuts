'use client';
import { useState, useMemo } from 'react';
import { formatMoney, formatDate, relativeTime, getInitials, avatarColorForId, statCellBorderClasses } from '@/lib/admin-utils';
import { AVATAR_COLORS } from '@/lib/admin-constants';
import type { CustomerTableRow, CustomerCounts } from '@/types/admin';
import CustomerDetailDrawer, { getTier, getActivity, deriveTags, TIER_CONFIG, ACTIVITY_CONFIG } from './CustomerDetailDrawer';

export type { CustomerTableRow, CustomerCounts };

type Props = {
  customers: CustomerTableRow[];
  counts: CustomerCounts;
};

type StatFilter = 'all' | 'new' | 'active' | 'connoisseurPlus' | 'atRisk';
type TierFilter = 'all' | 'master' | 'connoisseur' | 'regular';

const STAT_CELLS = [
  { key: 'all' as StatFilter, label: 'All', metaLabel: 'REGISTERED', dotClass: '' },
  { key: 'new' as StatFilter, label: 'New', metaLabel: 'JOINED IN 30 DAYS', dotClass: 'ink' },
  { key: 'active' as StatFilter, label: 'Active', metaLabel: 'ORDERED IN 90 DAYS', dotClass: 'green' },
  { key: 'connoisseurPlus' as StatFilter, label: 'Connoisseur+', metaLabel: '10+ ORDERS', dotClass: 'camel' },
  { key: 'atRisk' as StatFilter, label: 'At risk', metaLabel: 'DORMANT 90+ DAYS', dotClass: 'oxblood' },
];

const TIER_PILLS: Array<{ key: TierFilter; label: string }> = [
  { key: 'all', label: 'All tiers' },
  { key: 'master', label: 'Master Cut' },
  { key: 'connoisseur', label: 'Connoisseur' },
];

const PAGE_SIZE = 8;

function matchesStatFilter(row: CustomerTableRow, filter: StatFilter): boolean {
  if (filter === 'all') return true;
  const now = Date.now();
  const THIRTY_DAYS = 30 * 86400000;
  const NINETY_DAYS = 90 * 86400000;
  const accountAge = now - new Date(row.createdAt).getTime();
  if (filter === 'new') return accountAge < THIRTY_DAYS;
  if (filter === 'active') return !!row.lastOrderAt && now - new Date(row.lastOrderAt).getTime() <= NINETY_DAYS;
  if (filter === 'connoisseurPlus') return row.orderCount >= 10;
  if (filter === 'atRisk') {
    if (row.lastOrderAt) return now - new Date(row.lastOrderAt).getTime() > NINETY_DAYS;
    return accountAge > NINETY_DAYS;
  }
  return true;
}

function countForStat(key: StatFilter, counts: CustomerCounts): number {
  if (key === 'all') return counts.all;
  if (key === 'new') return counts.new;
  if (key === 'active') return counts.active;
  if (key === 'connoisseurPlus') return counts.connoisseurPlus;
  return counts.atRisk;
}

export default function CustomersClient({ customers, counts }: Props) {
  const [activeStatFilter, setActiveStatFilter] = useState<StatFilter>('all');
  const [activeTierFilter, setActiveTierFilter] = useState<TierFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerCustomer, setDrawerCustomer] = useState<CustomerTableRow | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = customers;
    rows = rows.filter((r) => matchesStatFilter(r, activeStatFilter));
    if (activeTierFilter !== 'all') {
      rows = rows.filter((r) => getTier(r.orderCount) === activeTierFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [customers, activeStatFilter, activeTierFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(pageRows.map((r) => r.id)));
    else setSelectedIds(new Set());
  }

  function openDrawer(customer: CustomerTableRow) {
    setDrawerCustomer(customer);
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    setDrawerCustomer(null);
    document.body.style.overflow = '';
  }

  function handleStatFilter(key: StatFilter) {
    setActiveStatFilter(key);
    setPage(1);
    setSelectedIds(new Set());
  }

  function handleTierFilter(tier: TierFilter) {
    setActiveTierFilter(tier);
    setPage(1);
    setSelectedIds(new Set());
  }

  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;

  return (
    <>
      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-paper border border-line-soft rounded-sm mb-6 overflow-hidden">
        {STAT_CELLS.map((cell, idx) => {
          const isActive = activeStatFilter === cell.key;
          const count = countForStat(cell.key, counts);
          return (
            <button
              key={cell.key}
              onClick={() => handleStatFilter(cell.key)}
              className={[
                'relative text-left px-4 py-4 sm:px-5 sm:py-5 transition-colors cursor-pointer',
                statCellBorderClasses(idx),
                isActive ? 'bg-cream' : 'hover:bg-cream',
              ].join(' ')}
            >
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-oxblood" />
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] tracking-[0.18em] uppercase text-muted">{cell.label}</span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background:
                      cell.dotClass === 'green' ? 'var(--color-green)' :
                      cell.dotClass === 'camel' ? 'var(--color-camel)' :
                      cell.dotClass === 'oxblood' ? 'var(--color-oxblood)' :
                      cell.dotClass === 'ink' ? 'var(--color-ink)' :
                      'var(--color-muted)',
                  }}
                />
              </div>
              <div className="font-display text-[22px] sm:text-[28px] font-normal leading-none tracking-tight mb-1">
                {count}
                {cell.key === 'new' && count > 0 && null}
                {cell.key === 'atRisk' && count > 0 && (
                  <em className="italic text-oxblood text-[14px] ml-0.5 font-normal">!</em>
                )}
              </div>
              <div className="font-mono text-[11px] text-muted tracking-[0.04em]">{cell.metaLabel}</div>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 mb-4">
        <label className="flex items-center gap-2.5 bg-paper border border-line rounded-full px-4 py-2 w-full sm:max-w-sm focus-within:border-ink transition-colors">
          <svg className="w-3.5 h-3.5 text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email…"
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-ink placeholder:text-muted min-w-0"
          />
          <span className="hidden sm:inline font-mono text-[10px] text-muted bg-cream-deep px-1.5 py-0.5 rounded tracking-[0.04em] shrink-0">⌘ K</span>
        </label>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {TIER_PILLS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleTierFilter(key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  activeTierFilter === key
                    ? 'bg-ink text-cream border border-ink'
                    : 'bg-paper border border-line text-ink-soft hover:border-ink hover:text-ink'
                }`}
              >
                {label}
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            ))}
            <button className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3.5 py-2 text-[13px] text-ink-soft hover:border-ink hover:text-ink transition-colors">
              More filters
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </button>
          </div>

          <button className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3.5 py-2 text-[13px] text-ink-soft hover:border-ink hover:text-ink transition-colors">
            Sort: Top spenders
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Table wrap */}
      <div className="bg-paper border border-line-soft rounded-sm overflow-hidden">

        {/* Bulk bar */}
        {someSelected && (
          <div className="flex items-center justify-between px-6 py-3 bg-ink text-cream">
            <div className="flex items-center gap-3 text-[13px]">
              <span className="bg-camel text-ink text-[12px] font-medium px-2 py-0.5 rounded-full">{selectedIds.size}</span>
              selected
            </div>
            <div className="flex gap-1.5">
              {['Email', 'Add tag', 'Adjust points', 'Export', 'Delete'].map((action) => (
                <button
                  key={action}
                  className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px] min-w-225">
              <thead className="bg-cream border-b border-line-soft">
                <tr>
                  <th className="w-9 pl-6 pr-0 py-3.5">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="w-4 h-4 rounded-sm border border-line bg-cream cursor-pointer accent-oxblood"
                    />
                  </th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Customer</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Tier</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">Lifetime spend ↓</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Orders</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">Avg order</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">Last order</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Activity</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Tags</th>
                  <th className="pr-6 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-muted text-sm">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((cust) => {
                    const tier = getTier(cust.orderCount);
                    const activity = getActivity(cust);
                    const tierCfg = TIER_CONFIG[tier];
                    const actCfg = ACTIVITY_CONFIG[activity];
                    const avatarColor = avatarColorForId(cust.id, AVATAR_COLORS);
                    const initials = getInitials(cust.name);
                    const isSelected = selectedIds.has(cust.id);
                    const avgOrder = cust.orderCount > 0 ? cust.totalSpend / cust.orderCount : 0;
                    const tags = deriveTags(cust);

                    return (
                      <tr
                        key={cust.id}
                        onClick={() => openDrawer(cust)}
                        className={`group border-b border-line-soft last:border-b-0 cursor-pointer transition-colors ${
                          isSelected ? 'bg-camel/6' : 'hover:bg-cream'
                        }`}
                      >
                        <td className="pl-6 pr-0 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(cust.id)}
                            className="w-4 h-4 rounded-sm border border-line bg-cream cursor-pointer accent-oxblood"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3 min-w-52">
                            <div className={`w-9 h-9 rounded-full grid place-items-center font-display font-semibold text-[12px] shrink-0 ${avatarColor}`}>
                              {initials}
                            </div>
                            <div>
                              <div className="font-medium text-[14px] leading-snug">{cust.name}</div>
                              <div className="font-mono text-[11px] text-muted tracking-[0.02em]">{cust.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-widest uppercase whitespace-nowrap ${tierCfg.pillClass}`}>
                            {tierCfg.showStar && (
                              <svg className="w-2.5 h-2.5 fill-current shrink-0" viewBox="0 0 24 24">
                                <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z" />
                              </svg>
                            )}
                            {tierCfg.label}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-display text-[16px] font-medium tracking-[-0.01em]">
                            {formatMoney(cust.totalSpend)}
                            <span className="text-muted text-[11px] ml-1 font-normal font-sans">USD</span>
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-mono text-[13px] font-medium">{cust.orderCount}</span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-mono text-[13px] text-ink-soft">
                            {avgOrder > 0 ? formatMoney(avgOrder) : '—'}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {cust.lastOrderAt ? (
                            <div className="text-[13px] leading-snug">
                              <div className="font-medium text-ink">{formatDate(cust.lastOrderAt)}</div>
                              <div className="font-mono text-[11px] text-muted mt-0.5">{relativeTime(cust.lastOrderAt)}</div>
                            </div>
                          ) : (
                            <span className="text-[13px] text-muted">—</span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] whitespace-nowrap ${actCfg.pillClass}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {actCfg.label}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1 max-w-48">
                            {tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag.label}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] tracking-[0.06em] uppercase whitespace-nowrap ${tag.cls}`}
                              >
                                {tag.label}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="pr-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openDrawer(cust)}
                              aria-label="View customer"
                              className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            <button
                              aria-label="Email customer"
                              className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                              </svg>
                            </button>
                            <button
                              aria-label="More"
                              className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /><circle cx="5" cy="12" r="1.5" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-paper to-transparent lg:hidden" />
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 bg-cream border-t border-line-soft flex-wrap gap-3">
          <div className="font-mono text-[12px] text-muted tracking-[0.04em]">
            Showing{' '}
            <strong className="text-ink font-medium">
              {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
            </strong>{' '}
            of <strong className="text-ink font-medium">{filtered.length}</strong> customers
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-8 h-8 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-paper hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-2.75 h-2.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>

            <div className="flex items-center gap-0.5 mx-2">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const n = i + 1;
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 rounded-full font-display text-[13px] transition-colors ${
                      page === n ? 'bg-ink text-cream' : 'text-ink-soft hover:bg-paper hover:text-ink'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="px-1 text-muted">…</span>}
              {totalPages > 5 && (
                <button
                  onClick={() => setPage(totalPages)}
                  className={`w-8 h-8 rounded-full font-display text-[13px] transition-colors ${
                    page === totalPages ? 'bg-ink text-cream' : 'text-ink-soft hover:bg-paper hover:text-ink'
                  }`}
                >
                  {totalPages}
                </button>
              )}
            </div>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="w-8 h-8 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-paper hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-2.75 h-2.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-mono text-[12px] text-muted">
            <span>Per page</span>
            <select className="appearance-none bg-paper border border-line rounded-full pl-3 pr-6 py-1.5 text-[12px] text-ink font-mono cursor-pointer bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238A7F73%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-no-repeat bg-position-[right_8px_center]">
              <option>8</option>
              <option>20</option>
              <option>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drawer backdrop */}
      {drawerCustomer && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50" onClick={closeDrawer} />
      )}

      {/* Customer detail drawer */}
      <aside
        className={`fixed top-0 right-0 w-full max-w-145 h-screen bg-cream z-51 flex flex-col shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          drawerCustomer ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {drawerCustomer && (
          <CustomerDetailDrawer customer={drawerCustomer} onClose={closeDrawer} />
        )}
      </aside>
    </>
  );
}
