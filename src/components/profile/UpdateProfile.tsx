'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

const empty = { currentPassword: '', newPassword: '', confirmNewPassword: '' };

export default function UpdateProfile() {
  const { data: session } = useSession();
  const [formData, setFormData] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false);
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${session?.user?.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (res.ok) {
        setFormData(empty);
        setSaved(true);
        toast.success('Password updated');
      } else {
        const text = await res.text();
        toast.error(text || 'Failed to update password');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-ink-soft mb-1.5">
          Current password
        </label>
        <input
          type="password"
          id="currentPassword"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange}
          autoComplete="current-password"
          required
          className="w-full border-b border-line bg-transparent py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
          placeholder="Your current password"
        />
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-ink-soft mb-1.5">
          New password
        </label>
        <input
          type="password"
          id="newPassword"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          className="w-full border-b border-line bg-transparent py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
          placeholder="Min. 8 characters"
        />
      </div>

      <div>
        <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-ink-soft mb-1.5">
          Confirm new password
        </label>
        <input
          type="password"
          id="confirmNewPassword"
          name="confirmNewPassword"
          value={formData.confirmNewPassword}
          onChange={handleChange}
          autoComplete="new-password"
          required
          className="w-full border-b border-line bg-transparent py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
          placeholder="Repeat password"
        />
      </div>

      <div className="pt-2 flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 bg-ink text-cream text-[13px] font-medium tracking-[0.04em] px-6 py-3 rounded-full transition-all hover:bg-oxblood disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Update password'}
        </button>

        {saved && (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-green font-medium">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Password updated
          </span>
        )}
      </div>
    </form>
  );
}
