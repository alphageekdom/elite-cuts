'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ROLE_GROUPS,
  type StaffFilterKey,
  type StaffRow,
} from '@/lib/staff-display';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import StaffSummaryCards from './StaffSummaryCards';
import StaffFilters from './StaffFilters';
import StaffTable from './StaffTable';
import StaffMobileCards from './StaffMobileCards';
import StaffProfileModal from './StaffProfileModal';
import StaffFormDrawer from './StaffFormDrawer';

type Props = {
  rows: StaffRow[];
  headerSubtitle: string;
};

// Sentinel for "drawer is open in create mode" — we can't use null because that
// also means "drawer is closed." Carrying an explicit shape keeps the prop type
// to StaffFormDrawer simple (StaffRow | null).
type DrawerState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; staff: StaffRow };

function matchesFilter(row: StaffRow, filter: StaffFilterKey): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'working-today':
      return row.workingToday;
    case 'off-today':
      return !row.workingToday;
    case 'butchers':
      return ROLE_GROUPS.butchers.includes(row.roleKey);
    case 'counter':
      return ROLE_GROUPS.counter.includes(row.roleKey);
    case 'delivery':
      return ROLE_GROUPS.delivery.includes(row.roleKey);
    case 'receiving':
      return ROLE_GROUPS.receiving.includes(row.roleKey);
  }
}

export default function StaffPageClient({ rows, headerSubtitle }: Props) {
  const [filter, setFilter] = useState<StaffFilterKey>('all');
  const [selectedStaff, setSelectedStaff] = useState<StaffRow | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>({ kind: 'closed' });

  const headerActions = (
    <button
      type="button"
      onClick={() => setDrawer({ kind: 'create' })}
      className="inline-flex items-center gap-2 bg-ink text-cream text-[12px] font-medium tracking-[0.04em] px-4 py-2.5 rounded-full hover:bg-oxblood transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Add staff
    </button>
  );

  function handleEdit(row: StaffRow) {
    setSelectedStaff(null); // close profile modal if it was open
    setDrawer({ kind: 'edit', staff: row });
  }

  const drawerStaff = drawer.kind === 'edit' ? drawer.staff : null;
  const drawerOpen = drawer.kind !== 'closed';

  const counts = useMemo<Record<StaffFilterKey, number>>(
    () => ({
      all: rows.length,
      'working-today': rows.filter((r) => r.workingToday).length,
      'off-today': rows.filter((r) => !r.workingToday).length,
      butchers: rows.filter((r) => ROLE_GROUPS.butchers.includes(r.roleKey)).length,
      counter: rows.filter((r) => ROLE_GROUPS.counter.includes(r.roleKey)).length,
      delivery: rows.filter((r) => ROLE_GROUPS.delivery.includes(r.roleKey)).length,
      receiving: rows.filter((r) => ROLE_GROUPS.receiving.includes(r.roleKey)).length,
    }),
    [rows],
  );

  const filteredRows = useMemo(
    () => rows.filter((r) => matchesFilter(r, filter)),
    [rows, filter],
  );

  const active = useMemo(() => rows.filter((r) => r.status === 'active').length, [rows]);
  const workingToday = counts['working-today'];
  const offToday = counts['off-today'];

  const isEmpty = rows.length === 0;

  return (
    <>
      <AdminPageHeader
        eyebrow="✦ Roster"
        breadcrumb="Staff"
        title="Shop"
        titleAccent="staff"
        subtitle={headerSubtitle}
        actions={headerActions}
      />

      {isEmpty ? (
        <div className="bg-paper border border-line-soft rounded-sm p-12 text-center">
          <p className="text-muted text-sm">
            No staff members yet. Click <span className="text-ink font-medium">Add staff</span> to create one.
          </p>
        </div>
      ) : (
        <>
          <StaffSummaryCards active={active} workingToday={workingToday} offToday={offToday} />

          <StaffFilters active={filter} onChange={setFilter} counts={counts} />

          {filteredRows.length === 0 ? (
            <FilterEmptyState filter={filter} onReset={() => setFilter('all')} />
          ) : (
            <>
              <StaffTable
                rows={filteredRows}
                onOpenProfile={setSelectedStaff}
                onEdit={handleEdit}
              />
              <StaffMobileCards rows={filteredRows} onOpenProfile={setSelectedStaff} />
            </>
          )}

          <StaffProfileModal
            staff={selectedStaff}
            onClose={() => setSelectedStaff(null)}
            onEdit={handleEdit}
          />
        </>
      )}

      {drawerOpen && (
        <StaffFormDrawer
          staff={drawerStaff}
          onClose={() => setDrawer({ kind: 'closed' })}
        />
      )}
    </>
  );
}

function FilterEmptyState({
  filter,
  onReset,
}: {
  filter: StaffFilterKey;
  onReset: () => void;
}) {
  if (filter === 'working-today') {
    return (
      <div className="bg-paper border border-line-soft rounded-sm p-10 text-center">
        <p className="font-display text-base text-ink mb-1.5">No staff scheduled today</p>
        <p className="text-muted text-[13px] mb-4">
          Add shifts from the Schedule tab to populate today&apos;s roster.
        </p>
        <Link
          href="/dashboard/schedule"
          className="inline-block text-[12px] tracking-[0.04em] uppercase text-oxblood hover:text-oxblood-deep font-medium"
        >
          View schedule →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-paper border border-line-soft rounded-sm p-10 text-center">
      <p className="font-display text-base text-ink mb-1.5">No staff members found</p>
      <p className="text-muted text-[13px] mb-4">Try changing the selected filter.</p>
      <button
        type="button"
        onClick={onReset}
        className="text-[12px] tracking-[0.04em] uppercase text-oxblood hover:text-oxblood-deep font-medium"
      >
        Reset filter
      </button>
    </div>
  );
}
