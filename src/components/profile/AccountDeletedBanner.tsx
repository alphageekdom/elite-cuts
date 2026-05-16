'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// One-time confirmation banner shown when the customer is redirected to /
// after self-deleting. Reads ?deleted=1&until=<iso>, displays, then strips
// the params so a refresh doesn't show the banner twice.
export default function AccountDeletedBanner() {
  const router = useRouter();
  const params = useSearchParams();
  const flag = params.get('deleted');
  const until = params.get('until');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (flag !== '1') return;
    setVisible(true);
    const url = new URL(window.location.href);
    url.searchParams.delete('deleted');
    url.searchParams.delete('until');
    router.replace(`${url.pathname}${url.search}${url.hash}`);
  }, [flag, router]);

  if (!visible) return null;

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
          onClick={() => setVisible(false)}
          className="ml-auto text-muted hover:text-ink transition-colors text-[12px] underline-offset-2 hover:underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
