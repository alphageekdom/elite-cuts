'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'react-toastify';

export default function UpdateProfile() {
  const router = useRouter();
  const { data: session } = useSession();

  const [formData, setFormData] = useState({ newPassword: '', confirmNewPassword: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) router.push('/login');
  }, [session, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${session?.user?.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.user?.userId,
          newPassword: formData.newPassword,
        }),
      });

      if (res.ok) {
        toast.success('Password updated — please sign in again');
        await signOut();
        router.push('/login');
      } else {
        toast.error('Failed to update password');
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
        <Link href="/profile" className="text-sm text-muted hover:text-ink transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  );
}
