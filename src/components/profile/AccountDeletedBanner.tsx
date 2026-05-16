'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Mode = 'deleted' | 'dormancyCleared';

// One-time confirmation banner shown when the customer is redirected to /
// after one of two lifecycle events:
//   - Self-deleted: `?deleted=1&until=<iso>` — explains the 30-day grace.
//   - Dormancy-warned customer signed in and cleared it: `?dormancyCleared=1`
//     — confirms the auto-cleanup is no longer pending.
// In both cases the param is stripped after display so a refresh doesn't
// re-show the banner.
export default function AccountDeletedBanner() {
  const router = useRouter();
  const params = useSearchParams();
  const deletedFlag = params.get('deleted');
  const dormancyFlag = params.get('dormancyCleared');
  const until = params.get('until');
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    const next: Mode | null =
      deletedFlag === '1' ? 'deleted' : dormancyFlag === '1' ? 'dormancyCleared' : null;
    if (!next) return;
    setMode(next);
    const url = new URL(window.location.href);
    url.searchParams.delete('deleted');
    url.searchParams.delete('dormancyCleared');
    url.searchParams.delete('until');
    router.replace(`${url.pathname}${url.search}${url.hash}`);
  }, [deletedFlag, dormancyFlag, router]);

  if (!mode) return null;

  if (mode === 'dormancyCleared') {
    return (
      <div className="bg-green/10 border-b border-green/30 text-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-start sm:items-center gap-3 text-[13px]">
          <span className="font-medium text-green">Welcome back!</span>
          <span className="text-ink-soft">
            Your account is no longer scheduled for cleanup. Thanks for stopping by.
          </span>
          <button
            type="button"
            onClick={() => setMode(null)}
            className="ml-auto text-muted hover:text-ink transition-colors text-[12px] underline-offset-2 hover:underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  let untilLabel = '';
  if (until) {
    const parsed = new Date(until);
    if (!Number.isNaN(parsed.getTime())) {
      untilLabel = parsed.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  return (
    <div className="bg-oxblood/10 border-b border-oxblood/30 text-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-start sm:items-center gap-3 text-[13px]">
        <span className="font-medium text-oxblood">Account scheduled for deletion.</span>
        <span className="text-ink-soft">
          {untilLabel
            ? `We'll permanently erase your account on ${untilLabel}. Sign in any time before then to restore it.`
            : `We'll permanently erase your account in 30 days. Sign in any time before then to restore it.`}
        </span>
        <button
          type="button"
          onClick={() => setMode(null)}
          className="ml-auto text-muted hover:text-ink transition-colors text-[12px] underline-offset-2 hover:underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
