'use client';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useStatFilter } from '@/hooks/useStatFilter';
import { useCustomersTable } from '@/hooks/useCustomersTable';
import AdminSearchInput from '@/components/admin/AdminSearchInput';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminStatStrip from '@/components/admin/AdminStatStrip';
import SortPopover from '@/components/ui/SortPopover';
import SlideDrawer from '@/components/admin/SlideDrawer';
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
import { matchesStatFilter, type StatFilter } from '@/lib/admin/customer-status';
import { downloadCsvFromUrl } from '@/lib/admin/download';
import {
  matchesAdvancedFilters,
  matchesSearch,
  sortCustomers,
  countForStat,
  type CustomerSortMode,
} from '@/lib/admin/customers';

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
  const table = useCustomersTable(customers);
  const [page, setPage] = useState(1);
  const { activeKey: activeStatFilter, selectKey: _selectStatFilter } = useStatFilter<string>('all', () => setPage(1));
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<CustomerSortMode>('top-spenders');
  const [filters, setFilters] = useState<CustomerFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [perPage, setPerPage] = useState(PAGE_SIZES[0]);

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
      const ok = await downloadCsvFromUrl(url, 'customers.csv');
      if (ok) toast.success('Customers exported');
      else toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  function handleCustomerCreated(row: CustomerTableRow) {
    table.prepend(row);
    setPage(1);
  }

  const filtered = useMemo(() => {
    const rows = table.customers
      .filter((r) => matchesStatFilter(r, activeStatFilter as StatFilter))
      .filter((r) => matchesSearch(r, search))
      .filter((r) => matchesAdvancedFilters(r, filters));
    return sortCustomers(rows, sortBy);
  }, [table.customers, activeStatFilter, search, sortBy, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);
  const filterBadgeCount = activeFilterCount(filters);
  const { selectedIds } = table.selection;
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;

  function toggleAll(checked: boolean) {
    table.selection.setSelection(checked ? pageRows.map((r) => r.id) : []);
  }

  function handleStatFilter(key: string) {
    _selectStatFilter(key);
    table.selection.clearSelection();
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
        cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        lastCellExtraClass="col-span-2 border-r-0 sm:border-r-0 lg:col-span-1"
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
              className={`inline-flex items-center gap-1.5 bg-paper border rounded-full px-3.5 py-2 text-[13px] transition-colors ${
                filtersOpen
                  ? 'border-oxblood text-ink'
                  : 'border-line text-ink-soft hover:border-ink hover:text-ink'
              }`}
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

          <SortPopover
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={(v) => { setSortBy(v); setPage(1); }}
          />
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
              {table.bulk.adjustMode ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={table.bulk.pointsDelta}
                    onChange={(e) => table.bulk.setPointsDelta(e.target.value)}
                    placeholder="+100 or -50"
                    autoFocus
                    className="w-28 bg-cream/10 border border-cream/30 rounded-full px-3 py-1 text-[12px] text-cream outline-none placeholder:text-cream/60"
                  />
                  <button
                    onClick={table.bulk.adjustPoints}
                    disabled={!!table.bulk.loading || !table.bulk.pointsDelta}
                    className="bg-camel text-ink rounded-full px-3 py-1.5 text-[12px] font-medium disabled:opacity-50"
                  >
                    {table.bulk.loading === 'points' ? '…' : 'Apply'}
                  </button>
                  <button
                    onClick={() => { table.bulk.setAdjustMode(false); table.bulk.setPointsDelta(''); }}
                    aria-label="Cancel points adjustment"
                    className="text-cream/60 px-2 hover:text-cream transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => table.bulk.setAdjustMode(true)}
                  disabled={!!table.bulk.loading}
                  className="bg-cream/10 text-cream border border-cream/20 rounded-full px-3 py-1.5 text-[12px] hover:bg-cream/20 hover:border-cream/40 transition-colors disabled:opacity-50"
                >
                  Adjust points
                </button>
              )}
              <button
                onClick={table.bulk.delete}
                disabled={!!table.bulk.loading}
                className="bg-oxblood/70 text-cream border border-oxblood rounded-full px-3 py-1.5 text-[12px] hover:bg-oxblood transition-colors disabled:opacity-50"
              >
                {table.bulk.loading === 'delete' ? 'Scheduling…' : 'Schedule delete'}
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
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted whitespace-nowrap">Last order</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Tags</th>
                  <th className="pr-6 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-muted text-sm">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((cust) => (
                    <CustomerTableRowComponent
                      key={cust.id}
                      cust={cust}
                      isSelected={selectedIds.has(cust.id)}
                      onView={table.drawer.open}
                      onToggleSelect={table.selection.toggleSelect}
                      onDelete={table.actions.softDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-paper to-transparent" />
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

      <SlideDrawer
        open={table.drawer.isOpen}
        onClose={table.drawer.close}
        ariaLabelledBy="customer-detail-title"
        widthClass="max-w-145"
      >
        {table.drawer.item && (
          <CustomerDetailDrawer
            customer={table.drawer.item}
            onClose={table.drawer.close}
            onSave={table.actions.save}
            onSaveNote={table.actions.saveNote}
            onDelete={table.actions.softDelete}
            onCancelDeletion={table.actions.cancelDeletion}
            onCancelDormancy={table.actions.cancelDormancy}
          />
        )}
      </SlideDrawer>

      <SlideDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        ariaLabelledBy="customer-create-title"
        widthClass="max-w-145"
      >
        {createOpen && (
          <CustomerCreateDrawer
            onClose={() => setCreateOpen(false)}
            onCreated={handleCustomerCreated}
          />
        )}
      </SlideDrawer>
    </>
  );
}
