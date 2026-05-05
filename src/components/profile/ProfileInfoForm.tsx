'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { EMAIL_RE } from '@/lib/validation';

type Props = {
  initialName: string;
  initialEmail: string;
  initialPhone: string;
};

type Info = { name: string; email: string; phone: string };

export default function ProfileInfoForm({ initialName, initialEmail, initialPhone }: Props) {
  const { data: session, update } = useSession();

  // current holds the last-saved values shown in read-only view
  const [current, setCurrent] = useState<Info>({
    name: initialName,
    email: initialEmail,
    phone: initialPhone,
  });

  // draft holds in-progress edits
  const [draft, setDraft] = useState<Info>(current);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatedFields, setUpdatedFields] = useState<Set<keyof Info>>(new Set());

  function handleEdit() {
    setDraft(current);
    setUpdatedFields(new Set());
    setEditing(true);
  }

  function handleCancel() {
    setDraft(current);
    setEditing(false);
  }

  function set(field: keyof Info, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedName = draft.name.trim();
    const trimmedEmail = draft.email.trim().toLowerCase();
    const trimmedPhone = draft.phone.trim();

    if (!trimmedName) { toast.error('Name is required'); return; }
    if (!EMAIL_RE.test(trimmedEmail)) { toast.error('Enter a valid email address'); return; }
    if (trimmedPhone && trimmedPhone.replace(/\D/g, '').length < 10) {
      toast.error('Phone number must have at least 10 digits');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${session?.user?.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, phone: trimmedPhone }),
      });

      if (res.ok) {
        const saved = { name: trimmedName, email: trimmedEmail, phone: trimmedPhone };
        const changed = new Set(
          (Object.keys(saved) as (keyof Info)[]).filter((k) => saved[k] !== current[k])
        );
        setCurrent(saved);
        setUpdatedFields(changed);
        await update({ name: trimmedName, email: trimmedEmail });
        toast.success('Profile updated');
        setEditing(false);
      } else {
        const text = await res.text();
        toast.error(text || 'Failed to update profile');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  const LABEL = 'text-[11px] tracking-[0.14em] uppercase text-muted mb-1';
  const INPUT = 'w-full border-b border-line bg-transparent py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors';

  if (!editing) {
    return (
      <div className="space-y-5">
        {(
          [
            { label: 'Full name',     field: 'name'  as keyof Info, value: current.name },
            { label: 'Email address', field: 'email' as keyof Info, value: current.email },
            { label: 'Phone number',  field: 'phone' as keyof Info, value: current.phone || '—' },
          ] as const
        ).map(({ label, field, value }) => (
          <div key={label} className="border-b border-line pb-4">
            <p className={LABEL}>{label}</p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-ink">{value}</p>
              {updatedFields.has(field) && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Updated
                </span>
              )}
            </div>
          </div>
        ))}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center gap-2 bg-ink text-cream text-[13px] font-medium tracking-[0.04em] px-6 py-3 rounded-full hover:bg-oxblood transition-colors"
          >
            Edit info
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-ink-soft mb-1.5">Full name</label>
        <input
          type="text"
          id="name"
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          autoComplete="name"
          required
          maxLength={80}
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink-soft mb-1.5">Email address</label>
        <input
          type="email"
          id="email"
          value={draft.email}
          onChange={(e) => set('email', e.target.value)}
          autoComplete="email"
          required
          maxLength={254}
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-ink-soft mb-1.5">
          Phone number <span className="font-normal text-muted text-xs">(optional)</span>
        </label>
        <input
          type="tel"
          id="phone"
          value={draft.phone}
          onChange={(e) => set('phone', e.target.value)}
          autoComplete="tel"
          maxLength={20}
          placeholder="(619) 555-0100"
          className={INPUT}
        />
      </div>

      <div className="pt-2 flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 bg-ink text-cream text-[13px] font-medium tracking-[0.04em] px-6 py-3 rounded-full hover:bg-oxblood transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="text-sm text-muted hover:text-ink transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
