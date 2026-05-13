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

export type { CustomerTableRow, CustomerCounts };

type Props = {
  customers: CustomerTableRow[];
  counts: CustomerCounts;
};

// 'atRisk' is intentionally absent. The portfolio seed has no dormant
// accounts, so a pill that filters to zero rows would just look broken.
// Tier filtering was likewise dropped — the Tier column still surfaces
// the value when there's enough data to make filtering useful.
type StatFilter = 'all' | 'new' | 'active' | 'connoisseurPlus';

const STAT_CELLS = [
  { key: 'all' as StatFilter, label: 'All', metaLabel: 'REGISTERED', dotClass: '' },
  { key: 'new' as StatFilter, label: 'New', metaLabel: 'JOINED IN 30 DAYS', dotClass: 'bg-ink' },
  { key: 'active' as StatFilter, label: 'Active', metaLabel: 'ORDERED IN 90 DAYS', dotClass: 'bg-green' },
  { key: 'connoisseurPlus' as StatFilter, label: 'Connoisseur+', metaLabel: '10+ ORDERS', dotClass: 'bg-camel' },
];

const PAGE_SIZES = [8, 20, 50];

function matchesStatFilter(row: CustomerTableRow, filter: StatFilter): boolean {
  if (filter === 'all') return true;
  const now = Date.now();
  const THIRTY_DAYS = 30 * 86400000;
  const NINETY_DAYS = 90 * 86400000;
  const accountAge = now - new Date(row.createdAt).getTime();
  if (filter === 'new') return accountAge < THIRTY_DAYS;
  if (filter === 'active') return !!row.lastOrderAt && now - new Date(row.lastOrderAt).getTime() <= NINETY_DAYS;
  if (filter === 'connoisseurPlus') return row.orderCount >= 10;
  return true;
}

function countForStat(key: StatFilter, counts: CustomerCounts): number {
  if (key === 'all') return counts.all;
  if (key === 'new') return counts.new;
  if (key === 'active') return counts.active;
  return counts.connoisseurPlus;
}

export default function CustomersClient({ customers, counts }: Props) {
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [page, setPage] = useState(1);
  const { activeKey: activeStatFilter, selectKey: _selectStatFilter } = useStatFilter<string>('all', () => setPage(1));
  const [search, setSearch] = useState('');
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

  async function handleCustomerDelete(id: string) {
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to delete customer');
        return;
      }
      setLocalCustomers((prev) => prev.filter((c) => c.id !== id));
      closeDrawer();
      toast.success('Customer deleted');
    } catch {
      toast.error('Failed to delete customer');
    }
  }

  const filtered = useMemo(() => {
    let rows = localCustomers;
    rows = rows.filter((r) => matchesStatFilter(r, activeStatFilter as StatFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [localCustomers, activeStatFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

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
      await Promise.all(ids.map((id) => fetch(`/api/users/${id}`, { method: 'DELETE' })));
      setLocalCustomers((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      toast.success(`${ids.length} customer${ids.length !== 1 ? 's' : ''} deleted`);
    } catch {
      toast.error('Failed to delete some customers');
    } finally {
      setBulkLoading('');
    }
  }

  return (
    <>
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
          <button onClick={() => toast.info('Coming soon')} className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3.5 py-2 text-[13px] text-ink-soft hover:border-ink hover:text-ink transition-colors">
            More filters
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>

          <button onClick={() => toast.info('Coming soon')} className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3.5 py-2 text-[13px] text-ink-soft hover:border-ink hover:text-ink transition-colors">
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
                {bulkLoading === 'delete' ? 'Deleting…' : 'Delete'}
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

      {/* Drawer backdrop */}
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50" onClick={closeDrawer} />
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
          />
        )}
      </aside>
    </>
  );
}
