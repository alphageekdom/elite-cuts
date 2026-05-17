'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { type ShiftColor } from '@/lib/shift-constants';
import FormDrawer from '@/components/admin/FormDrawer';
import FieldLabel from '@/components/admin/FieldLabel';
import ColorSwatchPicker from '@/components/admin/ColorSwatchPicker';
import {
  FORM_FIELD_CLS,
  ROLE_COLOR,
  ROLE_LABEL,
  STAFF_ROLE_KEYS,
  type StaffRoleKey,
} from '@/lib/staff-display';
import type { ShiftRow, StaffUserOption } from './ScheduleClient';

const HOUR_LABELS = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STAFF_OTHER_VALUE = '__other__';
const ROLE_OTHER_VALUE = '__other__';

// Quick-pick options: the six canonical role keys (skip 'other' since that's
// the free-text fallback). The select stores the label string (not the key)
// so the existing role-as-display-text shape on Shift documents is preserved.
const ROLE_QUICK_PICKS: StaffRoleKey[] = STAFF_ROLE_KEYS.filter(
  (k) => k !== 'other',
);

function findMatchingRoleLabel(role: string): string | null {
  const trimmed = role.trim();
  if (!trimmed) return null;
  const match = ROLE_QUICK_PICKS.find(
    (k) => ROLE_LABEL[k].toLowerCase() === trimmed.toLowerCase(),
  );
  return match ? ROLE_LABEL[match] : null;
}

type Props = {
  shift: ShiftRow | null;          // null = create mode
  defaultDayOfWeek?: number;       // 0-6, prefilled in create mode (e.g. today)
  defaultHourIndex?: number;       // 0-8, optional prefill (used by Phase D empty-cell click)
  weekStart: Date;                 // currently-viewed week
  staffUsers: StaffUserOption[];   // dropdown options
  onClose: () => void;
  onSaved: () => void;             // parent re-fetches shifts
};

export default function ShiftFormDrawer({
  shift,
  defaultDayOfWeek,
  defaultHourIndex,
  weekStart,
  staffUsers: staffUsersProp,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!shift;

  // Refresh the staff dropdown each time the drawer opens — the parent
  // schedule page only fetches at server-render time, so staff added on the
  // Staff tab after this page first loaded would otherwise be missing.
  // `cache: 'no-store'` bypasses any browser caching of the GET response.
  const [staffUsers, setStaffUsers] = useState<StaffUserOption[]>(staffUsersProp);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/staff', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        setStaffUsers(data as StaffUserOption[]);
      })
      .catch(() => {
        // Silent — the server-passed snapshot remains in place.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Staff value: match by name against the staff users list; if no match,
  // assume "Other (type in)" and keep the existing string in the text input.
  const matchedUser = useMemo(() => {
    if (!shift) return null;
    return staffUsers.find((u) => u.name === shift.staffName) ?? null;
  }, [shift, staffUsers]);

  const [staffMode, setStaffMode] = useState<string>(() => {
    if (!shift) return staffUsers[0]?._id ?? STAFF_OTHER_VALUE;
    if (matchedUser) return matchedUser._id;
    return STAFF_OTHER_VALUE;
  });
  const [staffNameOther, setStaffNameOther] = useState(() => {
    if (!shift) return '';
    return matchedUser ? '' : shift.staffName;
  });

  const [dayOfWeek, setDayOfWeek] = useState<number>(shift?.dayOfWeek ?? defaultDayOfWeek ?? 0);
  const [hourIndex, setHourIndex] = useState<number>(shift?.hourIndex ?? defaultHourIndex ?? 0);

  // Role select: holds either a canonical label (one of ROLE_QUICK_PICKS via
  // ROLE_LABEL) or ROLE_OTHER_VALUE — in which case the free-text input below
  // carries the actual value.
  const initialRoleLabel = shift?.role ?? '';
  const initialMatchedLabel = findMatchingRoleLabel(initialRoleLabel);
  const [roleMode, setRoleMode] = useState<string>(() => {
    if (initialMatchedLabel) return initialMatchedLabel;
    // Create mode without a matching role: default to whichever role the
    // chosen staff member already has, otherwise "Other".
    if (!shift) {
      const initialStaff = staffUsers[0];
      if (initialStaff && initialStaff.roleKey !== 'other') {
        return ROLE_LABEL[initialStaff.roleKey];
      }
    }
    return ROLE_OTHER_VALUE;
  });
  const [roleOther, setRoleOther] = useState(() => {
    if (initialMatchedLabel) return '';
    return initialRoleLabel;
  });

  const [color, setColor] = useState<ShiftColor>(() => {
    if (shift?.color) return shift.color;
    // Create mode: seed from the initial staff's role so the chain is
    // consistent — subsequent changes also derive color from role.
    const initialStaff = staffUsers[0];
    if (initialStaff && initialStaff.roleKey !== 'other') {
      return ROLE_COLOR[initialStaff.roleKey];
    }
    return 'marcus';
  });

  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Smart-default chain: picking a staff member fills role, picking a role
  // fills color. Both controls remain manually overridable afterward.
  function handleStaffChange(next: string) {
    setStaffMode(next);
    if (next === STAFF_OTHER_VALUE) return;
    const u = staffUsers.find((opt) => opt._id === next);
    if (!u) return;
    if (u.roleKey !== 'other') {
      setRoleMode(ROLE_LABEL[u.roleKey]);
      setRoleOther('');
      setColor(ROLE_COLOR[u.roleKey]);
    }
  }

  function handleRoleChange(next: string) {
    setRoleMode(next);
    if (next === ROLE_OTHER_VALUE) return;
    const matchedKey = ROLE_QUICK_PICKS.find((k) => ROLE_LABEL[k] === next);
    if (matchedKey) {
      setColor(ROLE_COLOR[matchedKey]);
    }
  }

  function resolvedStaffName(): string {
    if (staffMode === STAFF_OTHER_VALUE) return staffNameOther.trim();
    return staffUsers.find((u) => u._id === staffMode)?.name.trim() ?? '';
  }

  function resolvedRole(): string {
    if (roleMode === ROLE_OTHER_VALUE) return roleOther.trim();
    return roleMode;
  }

  const submitDisabled = saving || resolvedStaffName().length === 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const staffName = resolvedStaffName();
    if (!staffName) {
      toast.error('Pick a staff member or type a name');
      return;
    }
    setSaving(true);
    try {
      const url = isEdit ? `/api/shifts/${shift._id}` : '/api/shifts';
      const method = isEdit ? 'PATCH' : 'POST';
      const role = resolvedRole();
      const body = isEdit
        ? { staffName, role, color, dayOfWeek, hourIndex }
        : { weekStart: weekStart.toISOString(), staffName, role, color, dayOfWeek, hourIndex };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        const data = await res.json().catch(() => null) as
          | { conflict?: { staffName?: string } }
          | null;
        const who = data?.conflict?.staffName;
        toast.error(who ? `Slot already taken by ${who}` : 'Slot already taken');
        return;
      }
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'Failed to save shift' }));
        toast.error(message ?? 'Failed to save shift');
        return;
      }
      toast.success(isEdit ? 'Shift updated' : 'Shift created');
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to save shift');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!shift) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/shifts/${shift._id}`, { method: 'DELETE' });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'Failed to delete shift' }));
        toast.error(message ?? 'Failed to delete shift');
        return;
      }
      toast.success('Shift deleted');
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to delete shift');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <FormDrawer
      eyebrow={isEdit ? 'Edit shift' : 'New shift'}
      title={isEdit ? shift.staffName : 'Schedule a shift'}
      titleId="shift-form-title"
      subtitle={isEdit ? 'Update or remove this hour slot' : 'One staff member, one hour slot'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 px-6 py-5 gap-5">
          <div>
            <FieldLabel>Staff</FieldLabel>
            <select
              value={staffMode}
              onChange={(e) => handleStaffChange(e.target.value)}
              className={FORM_FIELD_CLS}
            >
              {staffUsers.map((u) => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
              <option value={STAFF_OTHER_VALUE}>Other (type a name)</option>
            </select>
            {staffMode === STAFF_OTHER_VALUE && (
              <input
                type="text"
                value={staffNameOther}
                onChange={(e) => setStaffNameOther(e.target.value)}
                placeholder="e.g. Casual contractor"
                maxLength={60}
                className={`${FORM_FIELD_CLS} mt-2`}
                autoFocus
              />
            )}
            {staffUsers.length === 0 && staffMode !== STAFF_OTHER_VALUE && (
              <p className="mt-1.5 text-[11px] text-muted">No staff users yet — mark a customer as staff from the Customers page, or type a name above.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Day</FieldLabel>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className={FORM_FIELD_CLS}
              >
                {DAY_LABELS.map((label, i) => (
                  <option key={label} value={i}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Hour</FieldLabel>
              <select
                value={hourIndex}
                onChange={(e) => setHourIndex(Number(e.target.value))}
                className={FORM_FIELD_CLS}
              >
                {HOUR_LABELS.map((label, i) => (
                  <option key={label} value={i}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <FieldLabel>Role</FieldLabel>
            <select
              value={roleMode}
              onChange={(e) => handleRoleChange(e.target.value)}
              className={FORM_FIELD_CLS}
            >
              {ROLE_QUICK_PICKS.map((k) => (
                <option key={k} value={ROLE_LABEL[k]}>{ROLE_LABEL[k]}</option>
              ))}
              <option value={ROLE_OTHER_VALUE}>Other (type a role)</option>
            </select>
            {roleMode === ROLE_OTHER_VALUE && (
              <input
                type="text"
                value={roleOther}
                onChange={(e) => setRoleOther(e.target.value)}
                placeholder="e.g. Cleanup, Trainer"
                maxLength={40}
                className={`${FORM_FIELD_CLS} mt-2`}
                autoFocus
              />
            )}
          </div>

          <div>
            <FieldLabel>Color</FieldLabel>
            <ColorSwatchPicker value={color} onChange={setColor} />
          </div>

          <div className="mt-auto pt-4 border-t border-line-soft space-y-3">
            <button
              type="submit"
              disabled={submitDisabled}
              className="w-full bg-ink text-cream text-[13px] font-medium tracking-[0.04em] py-3 rounded-full hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create shift'}
            </button>

            {isEdit && (
              confirmDelete ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="text-[12px] font-medium tracking-[0.04em] py-2.5 rounded-full border border-line text-ink-soft hover:border-ink hover:text-ink transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-[12px] font-medium tracking-[0.04em] py-2.5 rounded-full bg-oxblood text-cream hover:bg-oxblood/90 transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Confirm delete'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full text-[12px] font-medium tracking-[0.04em] py-2.5 rounded-full border border-oxblood/30 text-oxblood hover:bg-oxblood/5 transition-colors"
                >
                  Delete shift
                </button>
              )
            )}
          </div>
      </form>
    </FormDrawer>
  );
}
