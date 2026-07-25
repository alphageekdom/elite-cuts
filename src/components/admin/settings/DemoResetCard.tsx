'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { isDemoAdmin } from '@/lib/auth/demo-permissions';
import type { DemoResetCounts } from '@/lib/demo/reset';
import { sectionTitleCls, sectionSubCls } from '@/components/admin/AdminForm';

// "Reset demo data" card that sits on the Settings → General tab. Calls
// `/api/admin/demo/reset`, which shares one orchestrator with the nightly
// cron, so a manual reset and the overnight run lay down the same final
// state — demo-customer wipe plus catalog and shop-config restore.
//
// Hidden from a demo admin — the server endpoint refuses the same case
// anyway, but the card itself goes away so the demo admin doesn't see
// a button they're not supposed to use.
export default function DemoResetCard() {
  const { data: session } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (isDemoAdmin(session?.user)) return null;

  async function handleConfirm() {
    setResetting(true);
    try {
      const res = await fetch('/api/admin/demo/reset', { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        data?: DemoResetCounts;
      };
      if (!res.ok) {
        toast.error(body.message || 'Could not reset demo data');
        return;
      }
      const counts = body.data;
      if (!counts) {
        toast.success('Demo data reset.');
      } else {
        const customerPart = counts.userReset
          ? `${counts.ordersDeleted} order${counts.ordersDeleted === 1 ? '' : 's'} cleared`
          : 'no demo customer found';
        const catalogPart = `${counts.productsRestored} cut${counts.productsRestored === 1 ? '' : 's'} restored`;
        toast.success(`Demo data reset · ${customerPart} · ${catalogPart}.`);
      }
      setConfirming(false);
    } catch (error) {
      console.error('[DemoResetCard] reset failed', error);
      toast.error('Could not reset demo data');
    } finally {
      setResetting(false);
    }
  }

  return (
    <section>
      <h2 className={sectionTitleCls}>
        Demo <em className="italic text-oxblood font-normal">data</em>
      </h2>
      <p className={sectionSubCls}>
        Wipes the demo customer&apos;s orders, cart, bookmarks, addresses,
        saved cards, notifications, and rewards balance. Seeded products,
        reviews, promos, staff, and shifts are left in place so the rest
        of the shop stays populated. Runs automatically every night at
        3am ET; this button lets you re-prep the demo on demand.
      </p>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 border border-line text-ink text-[13px] font-medium tracking-[0.04em] px-5 py-2.5 rounded-full hover:border-ink hover:bg-cream-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          Reset demo data
        </button>
      ) : (
        <div className="inline-flex items-center gap-3 rounded-full border border-line bg-cream-deep px-4 py-2">
          <span className="text-[13px] text-ink-soft">
            Reset all demo customer data?
          </span>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-oxblood hover:text-ink transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:rounded-sm"
          >
            {resetting ? 'Resetting…' : 'Yes, reset'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={resetting}
            aria-label="Cancel reset"
            className="text-[13px] text-muted hover:text-ink transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:rounded-sm"
          >
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}
