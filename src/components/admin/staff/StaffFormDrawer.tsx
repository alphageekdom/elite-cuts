'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@/lib/staff/display';
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
  staff: StaffRow | null;  // null = create mode
  onClose: () => void;
};

// Drawer body — wrapped in `SlideDrawer` by the parent for focus trap +
// Escape, matching the other seven admin drawers. `staff-form-title` must
// match the `ariaLabelledBy` SlideDrawer is configured with.
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
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <DrawerHeader
        eyebrow={isEdit ? 'Edit staff' : 'New staff'}
        title={isEdit ? staff.name : 'Add a staff member'}
        titleId="staff-form-title"
        sub={isEdit ? 'Update or remove this staff record' : 'Roster entry — no login created'}
        onClose={onClose}
      />

      <DrawerBody>
        <div>
          <label htmlFor="staff-name" className={labelCls}>Name</label>
          <input
            id="staff-name"
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
          <label htmlFor="staff-role" className={labelCls}>Role</label>
          <SelectField
            id="staff-role"
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

        <div>
          <label htmlFor="staff-station" className={labelCls}>Station</label>
          <input
            id="staff-station"
            type="text"
            value={station}
            onChange={(e) => setStation(e.target.value)}
            placeholder="e.g. Front Counter, Butcher Station"
            maxLength={60}
            className={FORM_FIELD_CLS}
          />
        </div>

        {/* A swatch picker is a set of buttons, not one labelable control, so
            this heads a group rather than pointing `htmlFor` at nothing. */}
        <div role="group" aria-labelledby="staff-color-label">
          <span id="staff-color-label" className={labelCls}>Color</span>
          <ColorSwatchPicker value={color} onChange={setColor} />
        </div>

        <div>
          <label htmlFor="staff-status" className={labelCls}>Status</label>
          <SelectField
            id="staff-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StaffStatus)}
          >
            {STAFF_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </SelectField>
        </div>

        <div>
          <label htmlFor="staff-email" className={labelCls}>Email</label>
          <input
            id="staff-email"
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
          <label htmlFor="staff-notes" className={labelCls}>Notes</label>
          <textarea
            id="staff-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth knowing about this staff member"
            maxLength={500}
            rows={3}
            className={`${FORM_FIELD_CLS} resize-none`}
          />
        </div>

      </DrawerBody>

      <DrawerFooter
        blocker={
          !name.trim() ? 'Add a name'
          : !emailValid ? 'Fix the email address'
          : null
        }
        hint={isEdit && !isDirty ? 'No changes yet' : null}
        onCancel={onClose}
        submitType="submit"
        submitLabel={isEdit ? 'Save changes' : 'Create staff'}
        busyLabel="Saving…"
        busy={saving}
        disabled={submitDisabled}
        extra={isEdit ? <DrawerDeleteConfirm onDelete={handleDelete} busy={deleting} /> : null}
      />
    </form>
  );
}
