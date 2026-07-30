'use client';

import type { StaffFilterKey, StaffRow } from '@/lib/staff/display';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatStrip, { type StatCell } from '@/components/admin/AdminStatStrip';
import SlideDrawer from '@/components/admin/SlideDrawer';
import { DRAWER_WIDTH } from '@/components/admin/DrawerChrome';
import StaffTable from './StaffTable';
import StaffMobileCards from './StaffMobileCards';
import StaffProfileDrawer from './StaffProfileDrawer';
import StaffFormDrawer from './StaffFormDrawer';
import { useStaffTable } from '@/hooks/useStaffTable';

type Props = {
  rows: StaffRow[];
  headerSubtitle: string;
};

export default function StaffPageClient({ rows, headerSubtitle }: Props) {
  const {
    filter, setFilter, counts, filteredRows,
    profileStaff, setProfileStaff,
    formDrawer, openCreate, openEdit, closeForm, closeProfile,
  } = useStaffTable(rows);

  const isEmpty = rows.length === 0;
  const drawerStaff = formDrawer.kind === 'edit' ? formDrawer.staff : null;
  const drawerOpen = formDrawer.kind !== 'closed';

  const statCells: StatCell[] = [
    { key: 'all', label: 'All', value: counts.all, meta: 'STAFF', dotClass: 'bg-muted' },
    { key: 'active', label: 'Active', value: counts.active, meta: 'STATUS', dotClass: 'bg-green' },
    { key: 'working-today', label: 'Working', value: counts['working-today'], meta: 'TODAY', dotClass: 'bg-green' },
    { key: 'off-today', label: 'Off', value: counts['off-today'], meta: 'TODAY', dotClass: 'bg-muted' },
    { key: 'butchers', label: 'Butchers', value: counts.butchers, meta: 'ROLE', dotClass: 'bg-oxblood' },
    { key: 'counter', label: 'Counter', value: counts.counter, meta: 'ROLE', dotClass: 'bg-green' },
    { key: 'delivery', label: 'Delivery', value: counts.delivery, meta: 'ROLE', dotClass: 'bg-camel-soft' },
    { key: 'receiving', label: 'Receiving', value: counts.receiving, meta: 'ROLE', dotClass: 'bg-camel' },
  ];

  return (
    <>
      <AdminPageHeader
        eyebrow="Roster"
        breadcrumb="Staff"
        title="Shop"
        titleAccent="staff"
        subtitle={headerSubtitle}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-ink text-cream text-[12px] font-medium tracking-[0.04em] px-4 py-2.5 rounded-full hover:bg-oxblood transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add staff
          </button>
        }
      />

      {isEmpty ? (
        <div className="bg-paper border border-line-soft rounded-sm p-12 text-center">
          <p className="text-muted text-sm">
            No staff members yet. Click <span className="text-ink font-medium">Add staff</span> to create one.
          </p>
        </div>
      ) : (
        <>
          <AdminStatStrip
            cells={statCells}
            activeKey={filter}
            onSelect={(key) => setFilter(key as StaffFilterKey)}
            cols="grid-cols-2 sm:grid-cols-4 xl:grid-cols-8"
            wideBreakpoint="xl"
          />

          {filteredRows.length === 0 ? (
            <FilterEmptyState filter={filter} onReset={() => setFilter('all')} />
          ) : (
            <>
              <StaffTable
                rows={filteredRows}
                onOpenProfile={setProfileStaff}
                onEdit={openEdit}
              />
              <StaffMobileCards rows={filteredRows} onOpenProfile={setProfileStaff} />
            </>
          )}
        </>
      )}

      <SlideDrawer
        open={profileStaff !== null}
        onClose={closeProfile}
        widthClass={DRAWER_WIDTH.narrow}
        ariaLabelledBy="staff-profile-title"
      >
        {profileStaff && (
          <StaffProfileDrawer
            staff={profileStaff}
            onClose={closeProfile}
            onEdit={openEdit}
          />
        )}
      </SlideDrawer>

      <SlideDrawer
        open={drawerOpen}
        onClose={closeForm}
        widthClass={DRAWER_WIDTH.narrow}
        ariaLabelledBy="staff-form-title"
      >
        {drawerOpen && <StaffFormDrawer staff={drawerStaff} onClose={closeForm} />}
      </SlideDrawer>
    </>
  );
}

const FILTER_LABEL: Record<StaffFilterKey, string> = {
  all: 'All',
  active: 'Active',
  'working-today': 'Working today',
  'off-today': 'Off today',
  butchers: 'Butchers',
  counter: 'Counter',
  delivery: 'Delivery',
  receiving: 'Receiving',
};

function FilterEmptyState({
  filter,
  onReset,
}: {
  filter: StaffFilterKey;
  onReset: () => void;
}) {
  return (
    <div className="bg-paper border border-line-soft rounded-sm p-12 text-center">
      <p className="text-muted text-sm mb-3">
        No staff match{' '}
        <span className="text-ink font-medium">{FILTER_LABEL[filter]}</span>.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="text-[12px] tracking-[0.04em] uppercase text-oxblood hover:text-oxblood-deep transition-colors font-medium"
      >
        Show all staff →
      </button>
    </div>
  );
}
