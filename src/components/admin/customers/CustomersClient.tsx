'use client';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useStatFilter } from '@/hooks/useStatFilter';
import { useAdminDrawer } from '@/hooks/useAdminDrawer';
import AdminSearchInput from '@/components/admin/AdminSearchInput';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminStatStrip from '@/components/admin/AdminStatStrip';
import type { CustomerTableRow, CustomerCounts } from '@/types/admin';
import CustomerDetailDrawer from './CustomerDetailDrawer';
import CustomerTableRowComponent from './CustomerTableRow';
import CustomersPageHeader from './CustomersPageHeader';
import CustomerCreateDrawer from './CustomerCreateDrawer';
import CustomersFilterPanel, {
  EMPTY_FILTERS,
  activeFilterCount,
  type CustomerFilters,
} from './CustomersFilterPanel';
import { matchesStatFilter, type StatFilter } from '@/lib/customer-status';
import {
  matchesAdvancedFilters,
  matchesSearch,
  sortCustomers,
  countForStat,
  type CustomerSortMode,
} from '@/lib/admin-customers';

export type { CustomerTableRow, CustomerCounts };

type Props = {
  customers: CustomerTableRow[];
  counts: CustomerCounts;
  total: number;
  newThisWeek: number;
};

const SORT_OPTIONS: { value: CustomerSortMode; label: string }[] = [
  { value: 'top-spenders',    label: 'Top spenders' },
  { value: 'newest',          label: 'Newest' },
  { value: 'most-orders',     label: 'Most orders' },
  { value: 'recently-active', label: 'Recently active' },
  { value: 'name-asc',        label: 'Name A–Z' },
];

const STAT_CELLS = [
  { key: 'all' as StatFilter, label: 'All', metaLabel: 'REGISTERED', dotClass: '' },
  { key: 'new' as StatFilter, label: 'New', metaLabel: 'JOINED IN 30 DAYS', dotClass: 'bg-ink' },
  { key: 'active' as StatFilter, label: 'Active', metaLabel: 'ORDERED IN 90 DAYS', dotClass: 'bg-green' },
  { key: 'connoisseurPlus' as StatFilter, label: 'Connoisseur+', metaLabel: '10+ ORDERS', dotClass: 'bg-camel' },
  { key: 'dormant' as StatFilter, label: 'Dormant', metaLabel: 'WARNING SENT', dotClass: 'bg-oxblood' },
];

const PAGE_SIZES = [8, 20, 50];

export default function CustomersClient({ customers, counts, total, newThisWeek }: Props) {
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [page, setPage] = useState(1);
  const { activeKey: activeStatFilter, selectKey: _selectStatFilter } = useStatFilter<string>('all', () => setPage(1));
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<CustomerSortMode>('top-spenders');
  const [filters, setFilters] = useState<CustomerFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { item: drawerCustomer, isOpen: isDrawerOpen, open: openDrawer, close: closeDrawer, setItem: setDrawerCustomer } = useAdminDrawer<CustomerTableRow>();
  const [perPage, setPerPage] = useState(PAGE_SIZES[0]);

  async function handleCustomerSave(id: string, data: { name: string; email: string; phone: string }) {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to update customer');
        return;
      }
      setLocalCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...data } : c)),
      );
      setDrawerCustomer((prev) => (prev ? { ...prev, ...data } : prev));
      toast.success('Customer updated');
    } catch {
      toast.error('Failed to update customer');
    }
  }

  async function handleCustomerDelete(
    id: string,
    opts: { reason?: string; immediate?: boolean } = {},
  ) {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: opts.reason?.trim() || undefined,
          immediate: Boolean(opts.immediate),
        }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to delete customer');
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        deletionScheduledFor?: string;
      };

      if (opts.immediate) {
        setLocalCustomers((prev) => prev.filter((c) => c.id !== id));
        closeDrawer();
        toast.success('Customer permanently deleted');
      } else {
        setLocalCustomers((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  deletedAt: new Date().toISOString(),
                  deletionScheduledFor: data.deletionScheduledFor,
                }
              : c,
          ),
        );
        setDrawerCustomer((prev) =>
          prev && prev.id === id
            ? {
                ...prev,
                deletedAt: new Date().toISOString(),
                deletionScheduledFor: data.deletionScheduledFor,
              }
            : prev,
        );
        toast.success('Customer scheduled for deletion');
      }
    } catch {
      toast.error('Failed to delete customer');
    }
  }

  async function handleCancelDeletion(id: string) {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_deletion' }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to cancel deletion');
        return;
      }
      setLocalCustomers((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, deletedAt: undefined, deletionScheduledFor: undefined } : c,
        ),
      );
      setDrawerCustomer((prev) =>
        prev && prev.id === id
          ? { ...prev, deletedAt: undefined, deletionScheduledFor: undefined }
          : prev,
      );
      toast.success('Deletion cancelled');
    } catch {
      toast.error('Failed to cancel deletion');
    }
  }

  async function handleCancelDormancy(id: string) {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_dormancy' }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to cancel dormancy cleanup');
        return;
      }
      setLocalCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, dormancyWarnedAt: undefined } : c)),
      );
      setDrawerCustomer((prev) =>
        prev && prev.id === id ? { ...prev, dormancyWarnedAt: undefined } : prev,
      );
      toast.success('Dormancy cleanup cancelled');
    } catch {
      toast.error('Failed to cancel dormancy cleanup');
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (activeStatFilter !== 'all') params.set('status', String(activeStatFilter));
      if (search.trim()) params.set('search', search.trim());
      if (filters.createdFrom) params.set('from', filters.createdFrom);
      if (filters.createdTo) params.set('to', filters.createdTo);
      if (filters.hasOrders !== 'any') params.set('hasOrders', filters.hasOrders === 'yes' ? 'true' : 'false');
      if (filters.hasSavedCuts !== 'any') params.set('hasSavedCuts', filters.hasSavedCuts === 'yes' ? 'true' : 'false');
      if (filters.tiers.length > 0) params.set('tier', filters.tiers.join(','));
      if (filters.noteSearch.trim()) params.set('noteSearch', filters.noteSearch.trim());
      const url = `/api/users/export${params.size ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        toast.error('Export failed');
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? 'customers.csv';
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      toast.success('Customers exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  function handleCustomerCreated(row: CustomerTableRow) {
    setLocalCustomers((prev) => [row, ...prev]);
    setPage(1);
  }

  const filtered = useMemo(() => {
    const rows = localCustomers
      .filter((r) => matchesStatFilter(r, activeStatFilter as StatFilter))
      .filter((r) => matchesSearch(r, search))
      .filter((r) => matchesAdvancedFilters(r, filters));
    return sortCustomers(rows, sortBy);
  }, [localCustomers, activeStatFilter, search, sortBy, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);
  const filterBadgeCount = activeFilterCount(filters);

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

  function handleStatFilter(key: string) {
    _selectStatFilter(key);
    setSelectedIds(new Set());
  }

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;
  const [bulkLoading, setBulkLoading] = useState('');
  const [adjustPointsMode, setAdjustPointsMode] = useState(false);
  const [pointsDelta, setPointsDelta] = useState('');

  async function bulkAdjustPoints() {
    const delta = parseInt(pointsDelta, 10);
    if (isNaN(delta)) { toast.error('Enter a valid number'); return; }
    const ids = [...selectedIds];
    setBulkLoading('points');
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/users/${id}/points`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delta }),
          }),
        ),
      );
      setSelectedIds(new Set());
      setAdjustPointsMode(false);
      setPointsDelta('');
      toast.success(`Points adjusted for ${ids.length} customer${ids.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to adjust points');
    } finally {
      setBulkLoading('');
    }
  }

  async function bulkDeleteCustomers() {
    const ids = [...selectedIds];
    setBulkLoading('delete');
    try {
      // Bulk action stays as a soft-delete (no body) — bulk hard-delete is out
      // of scope for this feature. Read each response so the local row's
      // `deletionScheduledFor` reflects the server's clock instead of the
      // client's; otherwise a clock-skewed admin would see a date that
      // doesn't match what the cron is actually working against.
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
          const data = (await res.json().catch(() => ({}))) as {
            deletionScheduledFor?: string;
          };
          return { id, ok: res.ok, scheduledFor: data.deletionScheduledFor };
        }),
      );
      const successById = new Map(
        results.filter((r) => r.ok).map((r) => [r.id, r.scheduledFor]),
      );
      const nowIso = new Date().toISOString();
      setLocalCustomers((prev) =>
        prev.map((c) =>
          successById.has(c.id)
            ? {
                ...c,
                deletedAt: nowIso,
                deletionScheduledFor: successById.get(c.id),
              }
            : c,
        ),
      );
      setSelectedIds(new Set());
      const okCount = successById.size;
      if (okCount === ids.length) {
        toast.success(
          `${ids.length} customer${ids.length !== 1 ? 's' : ''} scheduled for deletion`,
        );
      } else {
        toast.error(
          `Scheduled ${okCount} of ${ids.length} — ${ids.length - okCount} failed`,
        );
      }
    } catch {
      toast.error('Failed to schedule deletion for some customers');
    } finally {
      setBulkLoading('');
    }
  }

  return (
    <>
      <CustomersPageHeader
        total={total}
        newThisWeek={newThisWeek}
        exporting={exporting}
        onExport={handleExport}
        onAddCustomer={() => setCreateOpen(true)}
      />

      <AdminStatStrip
        cells={STAT_CELLS.map((cell) => ({
          key: cell.key,
          label: cell.label,
          value: countForStat(cell.key, counts),
          meta: cell.metaLabel,
          dotClass: cell.dotClass || undefined,
        }))}
        activeKey={activeStatFilter}
        onSelect={handleStatFilter}
        cols="grid-cols-2 sm:grid-cols-4"
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 mb-4">
        <AdminSearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by name or email…"
          className="w-full sm:max-w-sm"
        />

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="relative">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3.5 py-2 text-[13px] text-ink-soft hover:border-ink hover:text-ink transition-colors"
            >
              More filters
              {filterBadgeCount > 0 && (
                <span className="bg-ink text-cream text-[10px] font-medium tracking-[0.04em] px-1.5 py-0.5 rounded-full leading-none">
                  {filterBadgeCount}
                </span>
              )}
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </button>
            {filtersOpen && (
              <CustomersFilterPanel
                filters={filters}
                onChange={(next) => { setFilters(next); setPage(1); }}
                onClear={() => { setFilters(EMPTY_FILTERS); setPage(1); }}
                onClose={() => setFiltersOpen(false)}
              />
            )}
          </div>

          <div className="relative inline-flex items-center bg-paper border border-line rounded-full hover:border-ink transition-colors">
            <span className="pl-3.5 pr-1 text-[13px] text-ink-soft pointer-events-none whitespace-nowrap">
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as CustomerSortMode); setPage(1); }}
              className="appearance-none bg-transparent border-none outline-none text-[13px] text-ink-soft pr-7 pl-1 py-2 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <svg className="w-3 h-3 text-muted absolute right-3 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
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
            <div className="flex items-center gap-1.5 flex-wrap">
              {adjustPointsMode ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={pointsDelta}
                    onChange={(e) => setPointsDelta(e.target.value)}
                    placeholder="+100 or -50"
                    autoFocus
                    className="w-28 bg-cream/10 border border-cream/30 rounded-full px-3 py-1 text-[12px] text-cream outline-none placeholder:text-cream/40"
                  />
                  <button
                    onClick={bulkAdjustPoints}
                    disabled={!!bulkLoading || !pointsDelta}
                    className="bg-camel text-ink rounded-full px-3 py-1.5 text-[12px] font-medium disabled:opacity-50"
                  >
                    {bulkLoading === 'points' ? '…' : 'Apply'}
                  </button>
                  <button
                    onClick={() => { setAdjustPointsMode(false); setPointsDelta(''); }}
                    className="text-cream/60 text-[12px] px-2 hover:text-cream"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAdjustPointsMode(true)}
                  disabled={!!bulkLoading}
                  className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors disabled:opacity-50"
                >
                  Adjust points
                </button>
              )}
              <button
                onClick={bulkDeleteCustomers}
                disabled={!!bulkLoading}
                className="bg-oxblood/70 text-cream border border-oxblood rounded-full px-3 py-1.5 text-[12px] hover:bg-oxblood transition-colors disabled:opacity-50"
              >
                {bulkLoading === 'delete' ? 'Scheduling…' : 'Schedule delete'}
              </button>
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
                  pageRows.map((cust) => (
                    <CustomerTableRowComponent
                      key={cust.id}
                      cust={cust}
                      isSelected={selectedIds.has(cust.id)}
                      openMenuId={openMenuId}
                      onView={openDrawer}
                      onToggleSelect={toggleSelect}
                      onMenuToggle={setOpenMenuId}
                      onDelete={handleCustomerDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-paper to-transparent lg:hidden" />
        </div>

        <AdminPagination
          page={page}
          totalPages={totalPages}
          filteredCount={filtered.length}
          perPage={perPage}
          pageSizes={PAGE_SIZES}
          noun="customers"
          onPageChange={setPage}
          onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
        />
      </div>

      {openMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
      )}

      {/* Drawer backdrop — only one drawer is ever open at a time, so close
          whichever it is rather than chain both calls. */}
      {(isDrawerOpen || createOpen) && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50"
          onClick={() => (createOpen ? setCreateOpen(false) : closeDrawer())}
        />
      )}

      {/* Customer detail drawer */}
      <aside
        className={`fixed top-0 right-0 w-full max-w-145 h-screen bg-cream z-51 flex flex-col shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {drawerCustomer && (
          <CustomerDetailDrawer
            key={drawerCustomer.id}
            customer={drawerCustomer}
            onClose={closeDrawer}
            onSave={handleCustomerSave}
            onDelete={handleCustomerDelete}
            onCancelDeletion={handleCancelDeletion}
            onCancelDormancy={handleCancelDormancy}
          />
        )}
      </aside>

      {/* Customer create drawer */}
      <aside
        className={`fixed top-0 right-0 w-full max-w-145 h-screen bg-cream z-51 shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          createOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {createOpen && (
          <CustomerCreateDrawer
            onClose={() => setCreateOpen(false)}
            onCreated={handleCustomerCreated}
          />
        )}
      </aside>
    </>
  );
}
