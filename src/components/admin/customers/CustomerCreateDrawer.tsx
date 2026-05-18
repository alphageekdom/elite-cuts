'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { EMAIL_RE } from '@/lib/validation';
import { inputCls } from '@/components/admin/settings/SettingsUI';
import type { CustomerTableRow } from '@/types/admin';

type Props = {
  onClose: () => void;
  onCreated: (row: CustomerTableRow) => void;
};

type CreateResponse = {
  message?: string;
  tempPassword?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    adminNote: string;
    createdAt: string;
  };
};

export default function CustomerCreateDrawer({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [emailError, setEmailError] = useState('');
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSubmit = name.trim() && email.trim() && !emailError;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || saving) return;

    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setEmailError('Enter a valid email address');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: trimmedEmail,
          phone: phone.trim(),
          adminNote: adminNote.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as CreateResponse;
      if (!res.ok || !data.user) {
        toast.error(data.message ?? 'Failed to create customer');
        return;
      }
      onCreated({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone || undefined,
        createdAt: data.user.createdAt,
        orderCount: 0,
        totalSpend: 0,
        savedCutsCount: 0,
        adminNote: data.user.adminNote,
      });
      if (data.tempPassword) {
        toast.success(`Customer created · temp password: ${data.tempPassword}`, {
          duration: 20000,
          description: 'Share this with the customer — it shows once.',
        });
      } else {
        toast.success('Customer created');
      }
      onClose();
    } catch {
      toast.error('Failed to create customer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="relative bg-ink text-cream px-8 py-7 shrink-0 overflow-hidden">
        <div className="absolute -top-30 -right-30 w-64 h-64 rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(184,137,90,0.18)_0%,transparent_60%)]" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="font-display italic text-[13px] text-camel mb-1">✦ New customer</div>
            <div className="font-display text-[26px] font-medium tracking-tight leading-tight">
              Add a customer
            </div>
            <div className="font-mono text-[11px] text-cream/55 tracking-[0.04em] mt-1.5">
              The customer gets a temp password they can change on sign-in.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-cream/15 bg-cream/8 text-cream grid place-items-center hover:border-cream/30 transition-colors shrink-0"
            aria-label="Close"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        <div>
          <label className="block text-[11px] font-medium tracking-[0.18em] uppercase text-muted mb-1.5">
            Name <span className="text-oxblood">·</span>
          </label>
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            maxLength={80}
            required
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium tracking-[0.18em] uppercase text-muted mb-1.5">
            Email <span className="text-oxblood">·</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
            onBlur={() => {
              const trimmed = email.trim();
              if (trimmed && !EMAIL_RE.test(trimmed)) setEmailError('Enter a valid email address');
            }}
            placeholder="customer@example.com"
            required
            className={inputCls}
          />
          {emailError && (
            <div className="mt-1.5 text-[12px] text-oxblood">{emailError}</div>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-medium tracking-[0.18em] uppercase text-muted mb-1.5">
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optional"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium tracking-[0.18em] uppercase text-muted mb-1.5">
            Internal note
          </label>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Anything the team should know"
            rows={3}
            maxLength={1000}
            className={`${inputCls} resize-y`}
          />
        </div>
      </div>

      <div className="px-8 py-4.5 bg-paper border-t border-line-soft shrink-0 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-full border border-line text-ink-soft text-[13px] font-medium hover:border-ink hover:text-ink transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="flex-1 px-4 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating…' : 'Create customer'}
        </button>
      </div>
    </form>
  );
}
