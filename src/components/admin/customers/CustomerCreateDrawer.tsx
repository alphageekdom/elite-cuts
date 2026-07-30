'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { EMAIL_RE } from '@/lib/validation';
import { inputCls, labelCls, DrawerField } from '@/components/admin/AdminForm';
import { DrawerHeader, DrawerBody, DrawerFooter } from '@/components/admin/DrawerChrome';
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

  const canSubmit = name.trim() && email.trim() && !emailError;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || saving) return;

    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
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
        lastActiveAt: new Date().toISOString(),
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
      {/* Was a dark ink header with a radial glow, mirroring the customer
          *detail* drawer's hero. That hero earns its treatment by carrying the
          customer's KPI strip; this one carried a title, so it was decoration
          that made the create drawer the only form in the admin not opening
          like the other eight. `CustomerDetailHero` is untouched. */}
      <DrawerHeader
        eyebrow="New customer"
        title="Add a customer"
        titleId="customer-create-title"
        sub="You get a temp password to pass on. They can change it from their profile."
        onClose={onClose}
      />

      <DrawerBody>
        <DrawerField label="Name">
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
        </DrawerField>

        <div>
          <label className={labelCls} htmlFor="customer-create-email">Email</label>
          <input
            id="customer-create-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
            onBlur={() => {
              const trimmed = email.trim();
              if (trimmed && !EMAIL_RE.test(trimmed)) setEmailError('Enter a valid email address');
            }}
            placeholder="customer@example.com"
            required
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? 'customer-create-email-error' : undefined}
            className={inputCls}
          />
          {emailError && (
            <p id="customer-create-email-error" className="mt-1.5 text-[12px] text-oxblood">
              {emailError}
            </p>
          )}
        </div>

        <DrawerField label="Phone">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optional"
            className={inputCls}
          />
        </DrawerField>

        <DrawerField label="Internal note">
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Anything the team should know"
            rows={3}
            maxLength={1000}
            className={`${inputCls} resize-y`}
          />
        </DrawerField>
      </DrawerBody>

      <DrawerFooter
        blocker={
          !name.trim() ? 'Add a name'
          : !email.trim() ? 'Add an email'
          : emailError ? 'Fix the email address'
          : null
        }
        onCancel={onClose}
        submitType="submit"
        submitLabel="Create customer"
        busyLabel="Creating…"
        busy={saving}
      />
    </form>
  );
}
