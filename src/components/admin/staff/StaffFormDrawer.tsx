'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { SHIFT_COLORS, type ShiftColor } from '@/lib/shift-constants';
import {
  COLOR_SWATCH,
  ROLE_COLOR,
  ROLE_LABEL,
  STAFF_ROLE_KEYS,
  STAFF_STATUSES,
  STATUS_LABEL,
  type StaffRoleKey,
  type StaffStatus,
} from '@/lib/staff-display';
import type { StaffRow } from './StaffPageClient';

const ROLE_OTHER_VALUE = '__other__';

// Quick-pick options: the six canonical roles (skip 'other' — that's the
// free-text fallback). Stores the canonical label string so it survives the
// round-trip with the existing API which treats `role` as free text.
const ROLE_QUICK_PICKS: StaffRoleKey[] = STAFF_ROLE_KEYS.filter((k) => k !== 'other');

function findMatchingRoleLabel(role: string): string | null {
  const trimmed = role.trim();
  if (!trimmed) return null;
  const match = ROLE_QUICK_PICKS.find(
    (k) => ROLE_LABEL[k].toLowerCase() === trimmed.toLowerCase(),
  );
  return match ? ROLE_LABEL[match] : null;
}

function roleKeyFromMode(roleMode: string): StaffRoleKey {
  if (roleMode === ROLE_OTHER_VALUE) return 'other';
  const matchedKey = ROLE_QUICK_PICKS.find((k) => ROLE_LABEL[k] === roleMode);
  return matchedKey ?? 'other';
}

type Props = {
  staff: StaffRow | null;  // null = create mode
  onClose: () => void;
};

export default function StaffFormDrawer({ staff, onClose }: Props) {
  const router = useRouter();
  const isEdit = staff !== null;

  const [name, setName] = useState(staff?.name ?? '');

  const initialMatchedLabel = findMatchingRoleLabel(staff?.role ?? '');
  const [roleMode, setRoleMode] = useState<string>(() => {
    if (initialMatchedLabel) return initialMatchedLabel;
    // For edit mode without a matching role, fall through to Other so the
    // existing free-text value survives. Create mode defaults to the first
    // canonical role.
    if (!staff) return ROLE_LABEL[ROLE_QUICK_PICKS[0]];
    return ROLE_OTHER_VALUE;
  });
  const [roleOther, setRoleOther] = useState(() => {
    if (initialMatchedLabel) return '';
    return staff?.role ?? '';
  });

  const [station, setStation] = useState(staff?.station ?? '');
  const [email, setEmail] = useState(staff?.email ?? '');
  const [status, setStatus] = useState<StaffStatus>(staff?.status ?? 'active');
  const [color, setColor] = useState<ShiftColor>(() => {
    if (staff?.color) return staff.color;
    // Create mode: seed color from the default role so the chain is consistent.
    return ROLE_COLOR[ROLE_QUICK_PICKS[0]];
  });
  const [notes, setNotes] = useState(staff?.notes ?? '');

  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Smart-default chain: changing the role auto-fills color from the role map.
  function handleRoleChange(next: string) {
    setRoleMode(next);
    if (next === ROLE_OTHER_VALUE) return;
    const matchedKey = ROLE_QUICK_PICKS.find((k) => ROLE_LABEL[k] === next);
    if (matchedKey) setColor(ROLE_COLOR[matchedKey]);
  }

  function resolvedRole(): string {
    if (roleMode === ROLE_OTHER_VALUE) return roleOther.trim();
    return roleMode;
  }

  function resolvedRoleKey(): StaffRoleKey {
    if (roleMode !== ROLE_OTHER_VALUE) return roleKeyFromMode(roleMode);
    // In Other mode: if the typed free-text matches the original staff.role,
    // the admin hasn't actually changed the role — preserve the original
    // roleKey so unrelated edits (station, email, etc.) don't silently
    // downgrade it to 'other'.
    const trimmed = roleOther.trim();
    if (staff && trimmed === (staff.role ?? '').trim()) {
      return staff.roleKey ?? 'other';
    }
    return 'other';
  }

  // Capture the *resolved* initial values once on mount. Comparing against
  // these (rather than `staff` directly) avoids a false-positive dirty state
  // when an existing record's free-text role doesn't match any canonical
  // label — the initial resolvedRoleKey snaps to 'other' even though
  // staff.roleKey may not be, and the form should still read as untouched.
  const [initial] = useState(() => ({
    name: staff?.name ?? '',
    role: resolvedRole(),
    roleKey: resolvedRoleKey(),
    station: staff?.station ?? '',
    email: staff?.email ?? '',
    status: (staff?.status ?? 'active') as StaffStatus,
    color: staff?.color ?? color,
    notes: staff?.notes ?? '',
  }));

  // In edit mode, Save is disabled until something differs from the snapshot.
  // In create mode any non-empty name is enough.
  const isDirty = !isEdit || (
    name.trim() !== initial.name ||
    resolvedRole() !== initial.role ||
    resolvedRoleKey() !== initial.roleKey ||
    station.trim() !== initial.station ||
    email.trim() !== initial.email ||
    status !== initial.status ||
    color !== initial.color ||
    notes.trim() !== initial.notes
  );

  // Light email check — just ensure it has @ and a dot in the domain if provided.
  // Server-side validation is the real source of truth.
  function isEmailShapeValid(value: string): boolean {
    if (!value) return true; // optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
  const emailValid = isEmailShapeValid(email.trim());

  const submitDisabled = saving || name.trim().length === 0 || !isDirty || !emailValid;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!isEmailShapeValid(email.trim())) {
      toast.error('Email looks malformed');
      return;
    }

    setSaving(true);
    try {
      const url = staff ? `/api/staff/${staff.id}` : '/api/staff';
      const method = staff ? 'PATCH' : 'POST';
      const body = {
        name: name.trim(),
        role: resolvedRole(),
        roleKey: resolvedRoleKey(),
        station: station.trim(),
        email: email.trim(),
        status,
        color,
        notes: notes.trim(),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'Failed to save staff' }));
        toast.error(message ?? 'Failed to save staff');
        return;
      }
      toast.success(isEdit ? 'Staff updated' : 'Staff created');
      router.refresh();
      onClose();
    } catch {
      toast.error('Failed to save staff');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!staff) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/staff/${staff.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'Failed to delete staff' }));
        toast.error(message ?? 'Failed to delete staff');
        return;
      }
      toast.success('Staff deleted');
      router.refresh();
      onClose();
    } catch {
      toast.error('Failed to delete staff');
    } finally {
      setDeleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // A11y: Escape close + focus trap. Pattern mirrors StaffProfileModal.
  // ---------------------------------------------------------------------------
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = drawerRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const id = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, []);

  const fieldCls =
    'w-full bg-cream border border-line-soft rounded-lg px-4 py-2.5 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-form-title"
        className="relative bg-paper w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col"
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line-soft shrink-0">
          <div className="pr-4">
            <div className="text-[11px] tracking-widest uppercase text-muted mb-1.5">
              {isEdit ? 'Edit staff' : 'New staff'}
            </div>
            <h2 id="staff-form-title" className="font-display text-[20px] font-normal tracking-tight leading-snug">
              {isEdit ? staff.name : 'Add a staff member'}
            </h2>
            <p className="mt-1 text-[12px] text-muted">
              {isEdit ? 'Update or remove this staff record' : 'Roster entry — no login created'}
            </p>
          </div>
          <button
            ref={closeRef}
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
            <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Carlos Mendez"
              maxLength={80}
              required
              className={fieldCls}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">Role</label>
            <select
              value={roleMode}
              onChange={(e) => handleRoleChange(e.target.value)}
              className={fieldCls}
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
                className={`${fieldCls} mt-2`}
                autoFocus
              />
            )}
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">Station</label>
            <input
              type="text"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              placeholder="e.g. Front Counter, Butcher Station"
              maxLength={60}
              className={fieldCls}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">Color</label>
            <div className="flex gap-3 flex-wrap">
              {SHIFT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  aria-pressed={color === c}
                  className="flex flex-col items-center gap-1.5 group focus:outline-none"
                >
                  <span
                    className={`w-9 h-9 rounded-full ${COLOR_SWATCH[c]} transition-all ${
                      color === c
                        ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper'
                        : 'opacity-70 group-hover:opacity-100'
                    }`}
                  />
                  <span
                    className={`text-[10px] tracking-[0.06em] capitalize ${
                      color === c ? 'text-ink font-medium' : 'text-muted'
                    }`}
                  >
                    {c}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StaffStatus)}
              className={fieldCls}
            >
              {STAFF_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@elitecuts.demo"
              maxLength={120}
              aria-invalid={!emailValid}
              className={fieldCls}
            />
            {!emailValid && (
              <p className="mt-1.5 text-[11px] text-oxblood">Email looks malformed</p>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth knowing about this staff member"
              maxLength={500}
              rows={3}
              className={`${fieldCls} resize-none`}
            />
          </div>

          <div className="mt-auto pt-4 border-t border-line-soft space-y-3">
            <button
              type="submit"
              disabled={submitDisabled}
              className="w-full bg-ink text-cream text-[13px] font-medium tracking-[0.04em] py-3 rounded-full hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create staff'}
            </button>
            {isEdit && !isDirty && !saving && (
              <p className="text-[11px] text-muted text-center -mt-1">No changes yet</p>
            )}

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
                  Delete staff
                </button>
              )
            )}
          </div>
        </form>
      </aside>
    </div>
  );
}
