'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { type ShiftColor } from '@/lib/shifts/constants';
import { labelCls } from '@/components/admin/AdminForm';
import {
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerDeleteConfirm,
} from '@/components/admin/DrawerChrome';
import { SelectField } from '@/components/ui/SelectField';
import ColorSwatchPicker from '@/components/admin/ColorSwatchPicker';
import { DAY_LABELS_SHORT, HOUR_LABELS } from '@/lib/shifts/schedule';
import {
  shiftCreateSchema,
  shiftPatchSchema,
} from '@/lib/shifts/schema';
import {
  FORM_FIELD_CLS,
  ROLE_COLOR,
  ROLE_LABEL,
  STAFF_ROLE_KEYS,
  type StaffRoleKey,
} from '@/lib/staff/display';
import type { ShiftRow, StaffUserOption } from '@/lib/admin/schedule';

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

// Drawer body — wrapped in `SlideDrawer` by the parent for focus trap +
// Escape, matching the other seven admin drawers. `shift-form-title` must
// match the `ariaLabelledBy` SlideDrawer is configured with.
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
      .then((payload) => {
        if (cancelled || !payload || !Array.isArray(payload.items)) return;
        setStaffUsers(payload.items as StaffUserOption[]);
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
  const blockerHint = resolvedStaffName().length === 0 ? 'Pick who is working' : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const staffName = resolvedStaffName();
    const role = resolvedRole();

    // Pre-submit safeParse through the same Zod schema the API will run so
    // admins see field-level messages without a round trip.
    const candidate = isEdit
      ? { staffName, role, color, dayOfWeek, hourIndex }
      : { weekStart: weekStart.toISOString(), staffName, role, color, dayOfWeek, hourIndex };
    const parsed = isEdit
      ? shiftPatchSchema.safeParse(candidate)
      : shiftCreateSchema.safeParse(candidate);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please fix the form before saving');
      return;
    }

    setSaving(true);
    try {
      const url = isEdit ? `/api/shifts/${shift._id}` : '/api/shifts';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (res.status === 409) {
        const payload = await res.json().catch(() => null) as
          | { conflict?: { staffName?: string } }
          | null;
        const who = payload?.conflict?.staffName;
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
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <DrawerHeader
        eyebrow={isEdit ? 'Edit shift' : 'New shift'}
        title={isEdit ? shift.staffName : 'Schedule a shift'}
        titleId="shift-form-title"
        sub={isEdit ? 'Update or remove this hour slot' : 'One staff member, one hour slot'}
        onClose={onClose}
      />

      <DrawerBody>
        <div>
          <label htmlFor="shift-staff" className={labelCls}>Staff</label>
          <SelectField
            id="shift-staff"
            value={staffMode}
            onChange={(e) => handleStaffChange(e.target.value)}
          >
            {staffUsers.map((u) => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
            <option value={STAFF_OTHER_VALUE}>Other (type a name)</option>
          </SelectField>
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
            <p className="mt-1.5 text-[11px] text-muted">No staff users yet — add one on the Staff page, or type a name above.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="shift-day" className={labelCls}>Day</label>
            <SelectField
              id="shift-day"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
            >
              {DAY_LABELS_SHORT.map((label, i) => (
                <option key={label} value={i}>{label}</option>
              ))}
            </SelectField>
          </div>
          <div>
            <label htmlFor="shift-hour" className={labelCls}>Hour</label>
            <SelectField
              id="shift-hour"
              value={hourIndex}
              onChange={(e) => setHourIndex(Number(e.target.value))}
            >
              {HOUR_LABELS.map((label, i) => (
                <option key={label} value={i}>{label}</option>
              ))}
            </SelectField>
          </div>
        </div>

        <div>
          <label htmlFor="shift-role" className={labelCls}>Role</label>
          <SelectField
            id="shift-role"
            value={roleMode}
            onChange={(e) => handleRoleChange(e.target.value)}
          >
            {ROLE_QUICK_PICKS.map((k) => (
              <option key={k} value={ROLE_LABEL[k]}>{ROLE_LABEL[k]}</option>
            ))}
            <option value={ROLE_OTHER_VALUE}>Other (type a role)</option>
          </SelectField>
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

        {/* A swatch picker is a set of buttons, not one labelable control, so
            this heads a group rather than pointing `htmlFor` at nothing. */}
        <div role="group" aria-labelledby="shift-color-label">
          <span id="shift-color-label" className={labelCls}>Color</span>
          <ColorSwatchPicker value={color} onChange={setColor} />
        </div>

      </DrawerBody>

      <DrawerFooter
        blocker={blockerHint}
        onCancel={onClose}
        submitType="submit"
        submitLabel={isEdit ? 'Save changes' : 'Create shift'}
        busyLabel="Saving…"
        busy={saving}
        disabled={submitDisabled}
        extra={isEdit ? <DrawerDeleteConfirm onDelete={handleDelete} busy={deleting} /> : null}
      />
    </form>
  );
}
