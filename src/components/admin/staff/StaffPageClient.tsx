'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ROLE_GROUPS,
  type StaffFilterKey,
  type StaffRoleKey,
  type StaffStatus,
} from '@/lib/staff-display';
import type { ShiftColor } from '@/lib/shift-constants';
import StaffSummaryCards from './StaffSummaryCards';
import StaffFilters from './StaffFilters';
import StaffTable from './StaffTable';
import StaffMobileCards from './StaffMobileCards';
import StaffProfileModal from './StaffProfileModal';

export type StaffRow = {
  id: string;
  name: string;
  role: string;
  roleKey: StaffRoleKey;
  station: string;
  status: StaffStatus;
  color: ShiftColor;
  email: string;
  notes: string;
  workingToday: boolean;
  todayShift: string | null;
};

type Props = {
  rows: StaffRow[];
};

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

export default function StaffPageClient({ rows }: Props) {
  const [filter, setFilter] = useState<StaffFilterKey>('all');
  const [selectedStaff, setSelectedStaff] = useState<StaffRow | null>(null);

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

  if (rows.length === 0) {
    return (
      <div className="bg-paper border border-line-soft rounded-sm p-12 text-center">
        <p className="text-muted text-sm">
          No staff members yet. Run the seed or POST to /api/staff to add some.
        </p>
      </div>
    );
  }

  return (
    <>
      <StaffSummaryCards active={active} workingToday={workingToday} offToday={offToday} />

      <StaffFilters active={filter} onChange={setFilter} counts={counts} />

      {filteredRows.length === 0 ? (
        <FilterEmptyState filter={filter} onReset={() => setFilter('all')} />
      ) : (
        <>
          <StaffTable rows={filteredRows} onOpenProfile={setSelectedStaff} />
          <StaffMobileCards rows={filteredRows} onOpenProfile={setSelectedStaff} />
        </>
      )}

      <StaffProfileModal
        staff={selectedStaff}
        onClose={() => setSelectedStaff(null)}
      />
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
