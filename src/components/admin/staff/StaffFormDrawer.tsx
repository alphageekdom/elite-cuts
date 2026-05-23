'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { type ShiftColor } from '@/lib/shift-constants';
import SlideDrawer from '@/components/admin/SlideDrawer';
import { labelCls } from '@/components/admin/AdminForm';
import ColorSwatchPicker from '@/components/admin/ColorSwatchPicker';
import AdminEyebrow from '@/components/admin/AdminEyebrow';
import {
  FORM_FIELD_CLS,
  ROLE_COLOR,
  ROLE_LABEL,
  STAFF_ROLE_KEYS,
  STAFF_STATUSES,
  STATUS_LABEL,
  type StaffRoleKey,
  type StaffRow,
  type StaffStatus,
} from '@/lib/staff-display';
import { EMAIL_RE, staffCreateSchema, staffPatchSchema } from '@/lib/staff/schema';

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

// Light email shape check — UX nudge that surfaces inline before submit.
// Reads the same regex the Zod schema enforces server-side and at submit.
function isEmailShapeValid(value: string): boolean {
  if (!value) return true;
  return EMAIL_RE.test(value);
}

type Props = {
  open: boolean;
  staff: StaffRow | null;  // null = create mode
  onClose: () => void;
};

export default function StaffFormDrawer(props: Props) {
  const { open, onClose } = props;
  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      widthClass="max-w-md"
      ariaLabelledBy="staff-form-title"
    >
      {open && <StaffFormBody {...props} />}
    </SlideDrawer>
  );
}

function StaffFormBody({ staff, onClose }: Props) {
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

  const emailValid = isEmailShapeValid(email.trim());

  const submitDisabled = saving || name.trim().length === 0 || !isDirty || !emailValid;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Pre-submit safeParse through the same Zod schema the API will run so
    // admins see field-level messages without a round trip.
    const candidate = {
      name,
      role: resolvedRole(),
      roleKey: resolvedRoleKey(),
      station,
      email,
      status,
      color,
      notes,
    };
    const parsed = isEdit
      ? staffPatchSchema.safeParse(candidate)
      : staffCreateSchema.safeParse(candidate);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please fix the form before saving');
      return;
    }

    setSaving(true);
    try {
      const url = staff ? `/api/staff/${staff.id}` : '/api/staff';
      const method = staff ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
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

  return (
    <>
      <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line-soft shrink-0">
        <div className="pr-4">
          <AdminEyebrow size="drawer" className="mb-1.5">
            {isEdit ? 'Edit staff' : 'New staff'}
          </AdminEyebrow>
          <h2
            id="staff-form-title"
            className="font-display text-[20px] font-normal tracking-tight leading-snug"
          >
            {isEdit ? staff.name : 'Add a staff member'}
          </h2>
          <p className="mt-1 text-[12px] text-muted">
            {isEdit ? 'Update or remove this staff record' : 'Roster entry — no login created'}
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

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 px-6 py-5 gap-5 overflow-y-auto">
        <div>
          <label className={labelCls}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Carlos Mendez"
            maxLength={80}
            required
            className={FORM_FIELD_CLS}
          />
        </div>

        <div>
          <label className={labelCls}>Role</label>
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
          <label className={labelCls}>Station</label>
          <input
            type="text"
            value={station}
            onChange={(e) => setStation(e.target.value)}
            placeholder="e.g. Front Counter, Butcher Station"
            maxLength={60}
            className={FORM_FIELD_CLS}
          />
        </div>

        <div>
          <label className={labelCls}>Color</label>
          <ColorSwatchPicker value={color} onChange={setColor} />
        </div>

        <div>
          <label className={labelCls}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StaffStatus)}
            className={FORM_FIELD_CLS}
          >
            {STAFF_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. name@elitecuts.demo"
            maxLength={120}
            aria-invalid={!emailValid}
            className={FORM_FIELD_CLS}
          />
          {!emailValid && (
            <p className="mt-1.5 text-[11px] text-oxblood">Email looks malformed</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth knowing about this staff member"
            maxLength={500}
            rows={3}
            className={`${FORM_FIELD_CLS} resize-none`}
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
    </>
  );
}
