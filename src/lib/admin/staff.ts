import type { Types } from 'mongoose';

import type { ShiftColor } from '@/lib/shift-constants';
import {
  ROLE_GROUPS,
  formatShiftRange,
  type StaffFilterKey,
  type StaffRoleKey,
  type StaffRow,
  type StaffStatus,
} from '@/lib/staff-display';
import { buildShiftRangeMap } from '@/lib/admin/schedule';

// Pure derivations the staff page uses. Lifted out so the page reads as
// query + named function calls, mirroring the inventory / messages /
// analytics / schedule derivations the recent audits moved here.

type RawStaff = {
  _id: Types.ObjectId;
  name: string;
  role?: string;
  roleKey?: string;
  station?: string;
  status?: string;
  color: ShiftColor;
  email?: string;
  notes?: string;
};

type RawShift = {
  staffName: string;
  hourIndex: number;
};

export function buildStaffRows(staff: RawStaff[], todaysShifts: RawShift[]): StaffRow[] {
  const shiftRanges = buildShiftRangeMap(todaysShifts);
  return staff.map((s) => {
    const range = shiftRanges.get(s.name);
    return {
      id: s._id.toString(),
      name: s.name,
      role: s.role ?? '',
      roleKey: (s.roleKey ?? 'other') as StaffRoleKey,
      station: s.station ?? '',
      status: (s.status ?? 'active') as StaffStatus,
      color: s.color,
      email: s.email ?? '',
      notes: s.notes ?? '',
      workingToday: Boolean(range),
      todayShift: range ? formatShiftRange(range.min, range.max) : null,
    };
  });
}

// Pure filter predicate — used by both the client list and any future
// shareable-URL filter pass.
export function matchesStaffFilter(row: StaffRow, filter: StaffFilterKey): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'active':
      return row.status === 'active';
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

export function buildStaffCounts(rows: StaffRow[]): Record<StaffFilterKey, number> {
  const counts: Record<StaffFilterKey, number> = {
    all: rows.length,
    active: 0,
    'working-today': 0,
    'off-today': 0,
    butchers: 0,
    counter: 0,
    delivery: 0,
    receiving: 0,
  };
  for (const r of rows) {
    if (r.status === 'active') counts.active++;
    if (r.workingToday) counts['working-today']++;
    else counts['off-today']++;
    if (ROLE_GROUPS.butchers.includes(r.roleKey)) counts.butchers++;
    else if (ROLE_GROUPS.counter.includes(r.roleKey)) counts.counter++;
    else if (ROLE_GROUPS.delivery.includes(r.roleKey)) counts.delivery++;
    else if (ROLE_GROUPS.receiving.includes(r.roleKey)) counts.receiving++;
  }
  return counts;
}
