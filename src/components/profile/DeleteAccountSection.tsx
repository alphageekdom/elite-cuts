'use client';

import { useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import DemoDisabledHint from '@/components/demo/DemoDisabledHint';
import { ACCOUNT_DELETION_GRACE_DAYS } from '@/lib/auth/account-deletion-constants';
import { useDismissOnEscape } from '@/hooks/useDismissOnEscape';
import { useFocusTrap } from '@/hooks/useFocusTrap';

const CONFIRMATION_PHRASE = 'DELETE';

// Customer-facing danger-zone block on the profile Settings tab. Triggers a
// 30-day soft delete; the customer can recover by signing back in within
// the window.
export default function DeleteAccountSection() {
  const { data: session } = useSession();
  const isDemo = Boolean(session?.user?.isDemo);
  const [modalOpen, setModalOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const canSubmit = phrase === CONFIRMATION_PHRASE && confirmed && !submitting;

  const resetModal = () => {
    setPhrase('');
    setConfirmed(false);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    resetModal();
  };

  // This destructive-confirm modal shipped as a bare `role="dialog"` with no
  // keyboard handling at all — no Escape, no focus trap, no restore. Focus lands
  // on the DELETE field on open, Tab stays inside, Escape and restore now match
  // every other dialog. closeModal already no-ops mid-submit.
  useDismissOnEscape(modalOpen, closeModal);
  useFocusTrap(modalOpen, panelRef);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/users/me', { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || 'Failed to delete account');
      }

      const data = (await res.json().catch(() => ({}))) as { deletionScheduledFor?: string };
      const scheduledFor = data.deletionScheduledFor ?? '';

      // Sign out and redirect home with the one-time banner flag.
      await signOut({
        redirect: true,
        callbackUrl: `/?deleted=1${scheduledFor ? `&until=${encodeURIComponent(scheduledFor)}` : ''}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast.error(message);
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-paper border border-line-soft rounded p-6 sm:p-8">
        <h2 className="font-display text-[28px] font-normal tracking-tight leading-tight mb-2">
          Delete <em className="italic text-oxblood">account</em>
        </h2>
        <p className="text-[13px] text-muted leading-relaxed mb-5 max-w-lg">
          Permanently close your EliteCuts account. Your profile is hidden immediately,
          and we keep it recoverable for {ACCOUNT_DELETION_GRACE_DAYS} days — sign back in any time before then
          to cancel. After that, your account and personal details are erased.
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={isDemo}
          title={isDemo ? 'Disabled in demo mode' : undefined}
          aria-disabled={isDemo}
          className="inline-flex items-center gap-2 border border-oxblood text-oxblood text-[13px] font-medium tracking-[0.04em] px-5 py-2.5 rounded-full transition-all hover:bg-oxblood hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-oxblood"
        >
          Delete my account
        </button>
        <DemoDisabledHint show={isDemo} className="mt-3" />
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/50 px-4 py-6"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div
            ref={panelRef}
            className="bg-paper border border-line-soft rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-account-title" className="font-display text-2xl font-normal mb-3">
              Delete your <em className="italic text-oxblood">account</em>?
            </h3>
            {/* "Anonymous records" was not true, and this is the moment it
                matters most — a customer reads this sentence while deciding.
                `hardDeleteUser` copies the real name, email and phone onto past
                orders and stamps the real name onto reviews and messages; only
                the link to the account is severed. The Privacy page states this
                accurately, and this dialog contradicted it. */}
            <p className="text-[13px] text-ink-soft leading-relaxed mb-5">
              Your account will be hidden immediately. You can recover it by signing back
              in any time in the next {ACCOUNT_DELETION_GRACE_DAYS} days. After that your profile, saved cuts, cart,
              saved cards, and reward points are erased for good. Past orders keep the
              name, email, and phone that were on them, and any reviews or messages you
              wrote stay published under your name — detached from your account, but not
              anonymous.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="confirm-phrase" className="block text-[11px] tracking-[0.14em] uppercase text-muted mb-1">
                  Type <span className="font-mono text-ink">DELETE</span> to confirm
                </label>
                <input
                  id="confirm-phrase"
                  type="text"
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  autoComplete="off"
                  className="w-full border-b border-line bg-transparent py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-oxblood transition-colors"
                  placeholder="DELETE"
                  disabled={submitting}
                />
              </div>
              <label className="flex items-start gap-2.5 text-[13px] text-ink-soft cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={submitting}
                  className="mt-0.5"
                />
                <span>
                  I understand my account will be permanently erased after{' '}
                  {ACCOUNT_DELETION_GRACE_DAYS} days.
                </span>
              </label>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 sm:justify-end pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="text-[13px] font-medium text-ink hover:text-oxblood transition-colors py-2.5 px-5 rounded-full disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center justify-center gap-2 bg-oxblood text-cream text-[13px] font-medium tracking-[0.04em] px-6 py-2.5 rounded-full transition-all hover:bg-ink disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2"
                >
                  {submitting ? 'Deleting…' : 'Delete account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
