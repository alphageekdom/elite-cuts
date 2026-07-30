'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  buildStaffCounts,
  matchesStaffFilter,
} from '@/lib/admin/staff';
import type { StaffFilterKey, StaffRow } from '@/lib/staff/display';

// Discriminated drawer state — closed / create (no row) / edit (with row).
// Sentinel shape mirrors the previous in-component definition.
type DrawerState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; staff: StaffRow };

// Feature hook for the staff dashboard client. Owns the stat-strip filter
// key, the form-drawer mode machine, the profile-drawer selection, and the
// counts + filtered-rows derivations. Mirrors the use{Domain}Table hooks
// the products / customers / orders / inventory dashboards already adopted.
export function useStaffTable(rows: StaffRow[]) {
  const [filter, setFilter] = useState<StaffFilterKey>('all');
  const [profileStaff, setProfileStaff] = useState<StaffRow | null>(null);
  const [formDrawer, setFormDrawer] = useState<DrawerState>({ kind: 'closed' });

  const counts = useMemo(() => buildStaffCounts(rows), [rows]);
  const filteredRows = useMemo(
    () => rows.filter((r) => matchesStaffFilter(r, filter)),
    [rows, filter],
  );

  const openCreate = useCallback(() => setFormDrawer({ kind: 'create' }), []);
  const openEdit = useCallback((row: StaffRow) => {
    setProfileStaff(null); // close profile drawer if it was open
    setFormDrawer({ kind: 'edit', staff: row });
  }, []);
  const closeForm = useCallback(() => setFormDrawer({ kind: 'closed' }), []);
  const closeProfile = useCallback(() => setProfileStaff(null), []);

  return {
    filter,
    setFilter,
    counts,
    filteredRows,
    profileStaff,
    setProfileStaff,
    formDrawer,
    openCreate,
    openEdit,
    closeForm,
    closeProfile,
  };
}
