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
        // "Cleared" alone under-reports now that history is put back — an
        // admin who read "6 orders cleared" and then found six orders on the
        // demo account would reasonably think the reset had failed.
        const customerPart = counts.userReset
          ? `${counts.ordersDeleted} order${counts.ordersDeleted === 1 ? '' : 's'} cleared, ${counts.ordersSeeded} reseeded`
          : 'no demo customer found';
        const catalogPart = `${counts.productsRestored} cut${counts.productsRestored === 1 ? '' : 's'} restored`;
        const summary = `Demo data reset · ${customerPart} · ${catalogPart}.`;
        // A swallowed rating recompute leaves a stale star average on the
        // product page, and this button is the recovery path an admin reaches
        // for when the nightly run misbehaved — reporting a plain success here
        // is what sent them away thinking it was fixed.
        const failed = counts.ratingRecomputeFailures;
        // Post-run verification outranks the rating warning. Both can be true
        // at once, and a missing cut or an empty staff roster is the more
        // serious of the two — it means the demo the next visitor opens is
        // genuinely incomplete, not merely showing a stale star average.
        //
        // The identifiers are named rather than counted, for the same reason
        // the log names them: "2 checks failed" sends an admin to comb the
        // dashboards, `product:dry-aged-ribeye` sends them to the row. Capped
        // at three so a wholesale failure does not produce a toast the width
        // of the screen.
        // `?? []` here while the API route reads `.length` unguarded, and that
        // asymmetry is deliberate rather than an oversight. The route builds the
        // object in-process, so the key cannot be absent. This reads it as JSON
        // off the wire, where the server may be an older deployment that
        // predates the field — which is the failure mode this whole feature
        // exists because of. Reading `.length` off undefined here would throw
        // inside the click handler and the admin would see nothing at all.
        const gaps = counts.validationFailures ?? [];
        if (gaps.length > 0) {
          const shown = gaps.slice(0, 3).join(', ');
          const rest = gaps.length > 3 ? ` and ${gaps.length - 3} more` : '';
          toast.warning(
            `${summary} Verification failed: ${shown}${rest}. The demo may be incomplete — run it again.`,
          );
        } else if (failed > 0) {
          toast.warning(
            `${summary} ${failed} rating${failed === 1 ? '' : 's'} could not be recomputed — run it again.`,
          );
        } else {
          toast.success(summary);
        }
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
        Clears the demo customer&apos;s cart, notifications and reviews, then
        puts their order history, saved cuts, saved cards, addresses and
        rewards balance back to the seeded starting state. The catalog, promos,
        staff and shifts are restored from the snapshot alongside. Runs
        automatically every night; this button lets you re-prep the demo on
        demand.
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
