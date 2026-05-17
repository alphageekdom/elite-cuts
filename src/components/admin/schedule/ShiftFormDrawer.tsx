'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SHIFT_COLORS, type ShiftColor } from '@/lib/shift-constants';
import type { ShiftRow, StaffUserOption } from './ScheduleClient';

const HOUR_LABELS = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const COLOR_SWATCH: Record<ShiftColor, string> = {
  tangelo:  'bg-oxblood',
  marcus:   'bg-ink',
  elena:    'bg-camel',
  sam:      'bg-green',
  maya:     'bg-camel-soft',
  delivery: 'bg-cream-deep border border-dashed border-line',
};

const STAFF_OTHER_VALUE = '__other__';

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
  staffUsers,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!shift;

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
  const [role, setRole] = useState(shift?.role ?? '');
  const [color, setColor] = useState<ShiftColor>(shift?.color ?? 'marcus');

  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function resolvedStaffName(): string {
    if (staffMode === STAFF_OTHER_VALUE) return staffNameOther.trim();
    return staffUsers.find((u) => u._id === staffMode)?.name.trim() ?? '';
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
      const body = isEdit
        ? { staffName, role: role.trim(), color, dayOfWeek, hourIndex }
        : { weekStart: weekStart.toISOString(), staffName, role: role.trim(), color, dayOfWeek, hourIndex };

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

  const fieldCls =
    'w-full bg-cream border border-line-soft rounded-lg px-4 py-2.5 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <aside className="relative bg-paper w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line-soft shrink-0">
          <div className="pr-4">
            <div className="text-[11px] tracking-widest uppercase text-muted mb-1.5">
              {isEdit ? 'Edit shift' : 'New shift'}
            </div>
            <h2 className="font-display text-[20px] font-normal tracking-tight leading-snug">
              {isEdit ? shift.staffName : 'Schedule a shift'}
            </h2>
            <p className="mt-1 text-[12px] text-muted">
              {isEdit ? 'Update or remove this hour slot' : 'One staff member, one hour slot'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full grid place-items-center text-muted hover:text-ink hover:bg-cream-deep transition-colors shrink-0 mt-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 px-6 py-5 gap-5">
          <div>
            <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">Staff</label>
            <select
              value={staffMode}
              onChange={(e) => setStaffMode(e.target.value)}
              className={fieldCls}
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
                className={`${fieldCls} mt-2`}
                autoFocus
              />
            )}
            {staffUsers.length === 0 && staffMode !== STAFF_OTHER_VALUE && (
              <p className="mt-1.5 text-[11px] text-muted">No staff users yet — mark a customer as staff from the Customers page, or type a name above.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">Day</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className={fieldCls}
              >
                {DAY_LABELS.map((label, i) => (
                  <option key={label} value={i}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">Hour</label>
              <select
                value={hourIndex}
                onChange={(e) => setHourIndex(Number(e.target.value))}
                className={fieldCls}
              >
                {HOUR_LABELS.map((label, i) => (
                  <option key={label} value={i}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Cutter, Counter, Delivery"
              maxLength={40}
              className={fieldCls}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">Color</label>
            <div className="flex gap-2 flex-wrap">
              {SHIFT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  aria-pressed={color === c}
                  className={`w-9 h-9 rounded-full ${COLOR_SWATCH[c]} transition-all ${
                    color === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
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
      </aside>
    </div>
  );
}
