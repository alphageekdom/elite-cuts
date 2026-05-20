'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { enablePromo, disablePromo } from '@/actions/promos';
import { btnPrimary } from '@/components/admin/settings/SettingsUI';
import PromoFormDrawer, { type PromoFormRow } from '@/components/admin/promos/PromoFormDrawer';
import { formatPromoLabel } from '@/lib/promos/format';

type PromoStatus = 'active' | 'scheduled' | 'expired' | 'exhausted' | 'disabled';

const STATUS_COPY: Record<PromoStatus, { label: string; tone: string }> = {
  active:    { label: 'Active',    tone: 'bg-green/10 text-green border-green/30' },
  scheduled: { label: 'Scheduled', tone: 'bg-camel/10 text-camel border-camel/30' },
  expired:   { label: 'Expired',   tone: 'bg-muted/10 text-muted border-line' },
  exhausted: { label: 'Exhausted', tone: 'bg-oxblood/10 text-oxblood border-oxblood/30' },
  disabled:  { label: 'Disabled',  tone: 'bg-muted/10 text-muted border-line' },
};

function deriveStatus(p: PromoFormRow, now: number): PromoStatus {
  if (!p.isActive) return 'disabled';
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return 'scheduled';
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return 'expired';
  if (p.usageLimit != null && p.usageCount >= p.usageLimit) return 'exhausted';
  return 'active';
}

type Props = {
  promos: PromoFormRow[];
  savingsByPromoId: Record<string, number>;
};

export default function PromosClient({ promos, savingsByPromoId }: Props) {
  const router = useRouter();
  const [drawerPromo, setDrawerPromo] = useState<PromoFormRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const toggleActive = (p: PromoFormRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingId(p.id);
    startTransition(async () => {
      const result = p.isActive ? await disablePromo(p.id) : await enablePromo(p.id);
      setTogglingId(null);
      if (!result.success) {
        toast.error(result.error ?? 'Action failed');
        return;
      }
      toast.success(p.isActive ? 'Promo disabled' : 'Promo enabled');
      router.refresh();
    });
  };

  const openCreate = () => {
    setDrawerPromo(null);
    setIsCreating(true);
    setDrawerOpen(true);
  };

  const openEdit = (promo: PromoFormRow) => {
    setDrawerPromo(promo);
    setIsCreating(false);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const onSaved = () => {
    setDrawerOpen(false);
    router.refresh();
  };

  return (
    <div className="px-6 py-8 lg:px-10">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
            → Promo codes
          </p>
          <h1 className="mt-1 font-display text-[28px] font-medium tracking-tight">
            {promos.length} code{promos.length === 1 ? '' : 's'}
          </h1>
        </div>
        <button type="button" onClick={openCreate} className={btnPrimary}>
          + New promo
        </button>
      </header>

      <div className="overflow-x-auto rounded-sm border border-line-soft bg-paper">
        <table className="w-full border-collapse text-[14px]">
          <thead className="border-b border-line-soft bg-cream">
            <tr>
              <th className="px-4 py-3.5 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                Code
              </th>
              <th className="px-4 py-3.5 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                Type
              </th>
              <th className="px-4 py-3.5 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                Status
              </th>
              <th className="px-4 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                Used
              </th>
              <th className="px-4 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                Savings to date
              </th>
              <th className="px-4 py-3.5" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {promos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-muted">
                  No promo codes yet — click <em>New promo</em> to create the first one.
                </td>
              </tr>
            )}
            {promos.map((p) => {
              const status = deriveStatus(p, now);
              const statusCopy = STATUS_COPY[status];
              const typeLabel = formatPromoLabel(p);
              const usedDisplay =
                p.usageLimit == null
                  ? `${p.usageCount} / ∞`
                  : `${p.usageCount} / ${p.usageLimit}`;
              const savings = savingsByPromoId[p.id] ?? 0;
              return (
                <tr
                  key={p.id}
                  onClick={() => openEdit(p)}
                  className="group cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-cream"
                >
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-[13px] font-medium tracking-[0.04em]">
                      {p.code}
                    </span>
                    {p.description && (
                      <p className="mt-0.5 text-[11px] text-muted">{p.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-ink-soft">{typeLabel}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-[0.04em] ${statusCopy.tone}`}
                    >
                      {statusCopy.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-[12px] text-ink-soft">
                    {usedDisplay}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-[12px] text-ink-soft">
                    ${savings.toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={(e) => toggleActive(p, e)}
                      disabled={togglingId === p.id}
                      className="text-[12px] text-ink-soft underline decoration-line underline-offset-2 transition-colors hover:text-ink disabled:opacity-50"
                    >
                      {togglingId === p.id ? '…' : p.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
          onClick={closeDrawer}
        />
      )}
      <aside
        className={`fixed top-0 right-0 z-51 flex h-screen w-full max-w-150 flex-col bg-cream shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {drawerOpen && (
          <PromoFormDrawer
            key={isCreating ? 'new' : drawerPromo?.id}
            promo={isCreating ? null : drawerPromo}
            onClose={closeDrawer}
            onSaved={onSaved}
          />
        )}
      </aside>
    </div>
  );
}
