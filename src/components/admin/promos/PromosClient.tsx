'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { enablePromo, disablePromo } from '@/actions/promos';
import { btnPrimary } from '@/components/admin/settings/SettingsUI';
import AdminStatStrip, { type StatCell } from '@/components/admin/AdminStatStrip';
import PromoFormDrawer, { type PromoFormRow } from '@/components/admin/promos/PromoFormDrawer';
import { formatPromoLabel } from '@/lib/promos/format';

type PromoStatus = 'active' | 'scheduled' | 'expired' | 'exhausted' | 'disabled';
type FilterKey = 'all' | PromoStatus;

const STATUS_COPY: Record<PromoStatus, { label: string; tone: string; dotClass: string }> = {
  active:    { label: 'Active',    tone: 'bg-green/10 text-green border-green/30',          dotClass: 'bg-green' },
  scheduled: { label: 'Scheduled', tone: 'bg-camel/10 text-camel border-camel/30',          dotClass: 'bg-camel' },
  expired:   { label: 'Expired',   tone: 'bg-muted/10 text-muted border-line',              dotClass: 'bg-muted' },
  exhausted: { label: 'Exhausted', tone: 'bg-oxblood/10 text-oxblood border-oxblood/30',    dotClass: 'bg-oxblood' },
  disabled:  { label: 'Disabled',  tone: 'bg-muted/10 text-muted border-line',              dotClass: 'bg-muted' },
};

const STATUS_ORDER: PromoStatus[] = ['active', 'scheduled', 'expired', 'exhausted', 'disabled'];

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
  const [activeKey, setActiveKey] = useState<FilterKey>('all');

  const { rowsWithStatus, counts, filteredRows } = useMemo(() => {
    const withStatus = promos.map((p) => ({ promo: p, status: deriveStatus(p, now) }));
    const tally: Record<PromoStatus, number> = {
      active: 0, scheduled: 0, expired: 0, exhausted: 0, disabled: 0,
    };
    for (const row of withStatus) tally[row.status] += 1;
    const filtered = activeKey === 'all'
      ? withStatus
      : withStatus.filter((row) => row.status === activeKey);
    return { rowsWithStatus: withStatus, counts: tally, filteredRows: filtered };
  }, [promos, now, activeKey]);

  const cells: StatCell[] = [
    { key: 'all',       label: 'All codes',  value: rowsWithStatus.length, meta: 'total' },
    ...STATUS_ORDER.map((s) => ({
      key: s,
      label: STATUS_COPY[s].label,
      value: counts[s],
      meta: counts[s] === 1 ? '1 code' : `${counts[s]} codes`,
      dotClass: STATUS_COPY[s].dotClass,
    })),
  ];

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

  const showEmptyAll = rowsWithStatus.length === 0;
  const showEmptyFiltered = !showEmptyAll && filteredRows.length === 0;
  const activeFilterLabel = activeKey === 'all' ? null : STATUS_COPY[activeKey].label.toLowerCase();

  return (
    <div className="px-6 py-8 lg:px-10">
      <header className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
            → Promo codes
          </p>
          <h1 className="mt-1 font-display text-[22px] font-medium tracking-tight sm:text-[28px]">
            {promos.length} code{promos.length === 1 ? '' : 's'}
          </h1>
        </div>
        <button type="button" onClick={openCreate} className={btnPrimary}>
          + New promo
        </button>
      </header>

      <AdminStatStrip
        cells={cells}
        activeKey={activeKey}
        onSelect={(k) => setActiveKey(k as FilterKey)}
        cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
        wideBreakpoint="lg"
      />

      {showEmptyAll && (
        <div className="rounded-sm border border-line-soft bg-paper px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cream">
            <svg aria-hidden="true" className="h-5 w-5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </div>
          <h2 className="font-display text-[18px] font-medium text-ink">No promo codes yet</h2>
          <p className="mt-1 text-[13px] text-muted">Create your first code to start running campaigns.</p>
          <button type="button" onClick={openCreate} className={`${btnPrimary} mt-5`}>
            + New promo
          </button>
        </div>
      )}

      {showEmptyFiltered && (
        <div className="rounded-sm border border-line-soft bg-paper px-6 py-12 text-center text-[13px] text-muted">
          No {activeFilterLabel} promo codes right now.{' '}
          <button
            type="button"
            onClick={() => setActiveKey('all')}
            className="underline decoration-line underline-offset-2 hover:text-ink"
          >
            Show all codes
          </button>
        </div>
      )}

      {!showEmptyAll && !showEmptyFiltered && (
        <>
          {/* Mobile card list — below sm: the 6-column table overflows the iPhone SE viewport */}
          <div className="space-y-3 sm:hidden">
            {filteredRows.map(({ promo: p, status }) => {
              const statusCopy = STATUS_COPY[status];
              const typeLabel = formatPromoLabel(p);
              const usedDisplay = p.usageLimit == null
                ? `${p.usageCount} / ∞`
                : `${p.usageCount} / ${p.usageLimit}`;
              const savings = savingsByPromoId[p.id] ?? 0;
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openEdit(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openEdit(p);
                    }
                  }}
                  className="group flex w-full cursor-pointer flex-col gap-2 rounded-sm border border-line-soft bg-paper px-4 py-4 text-left transition-colors hover:border-line hover:bg-cream focus:outline-none focus-visible:border-ink"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[13px] font-medium tracking-[0.04em] text-ink">
                      {p.code}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] ${statusCopy.tone}`}
                    >
                      {statusCopy.label}
                    </span>
                  </div>
                  {p.description && (
                    <p className="line-clamp-2 text-[12px] text-muted">{p.description}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-ink-soft">
                    <span>{typeLabel}</span>
                    <span aria-hidden="true" className="text-muted/50">·</span>
                    <span>{usedDisplay}</span>
                    <span aria-hidden="true" className="text-muted/50">·</span>
                    <span>${savings.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => toggleActive(p, e)}
                      disabled={togglingId === p.id}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.04em] transition-colors disabled:cursor-wait disabled:opacity-50 ${
                        p.isActive
                          ? 'border-line text-ink-soft hover:border-oxblood hover:text-oxblood'
                          : 'border-line text-ink-soft hover:border-ink hover:text-ink'
                      }`}
                    >
                      {togglingId === p.id ? '…' : p.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-sm border border-line-soft bg-paper sm:block">
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
                {filteredRows.map(({ promo: p, status }) => {
                  const statusCopy = STATUS_COPY[status];
                  const typeLabel = formatPromoLabel(p);
                  const usedDisplay = p.usageLimit == null
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
                          <p
                            className="mt-0.5 line-clamp-1 text-[11px] text-muted"
                            title={p.description}
                          >
                            {p.description}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-ink-soft">
                        {typeLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-[0.04em] ${statusCopy.tone}`}
                        >
                          {statusCopy.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono text-[12px] text-ink-soft">
                        {usedDisplay}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono text-[12px] text-ink-soft">
                        ${savings.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={(e) => toggleActive(p, e)}
                            disabled={togglingId === p.id}
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.04em] transition-colors disabled:cursor-wait disabled:opacity-50 ${
                              p.isActive
                                ? 'border-line text-ink-soft hover:border-oxblood hover:text-oxblood'
                                : 'border-line text-ink-soft hover:border-ink hover:text-ink'
                            }`}
                          >
                            {togglingId === p.id ? '…' : p.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <svg
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0 text-muted/40 transition-colors group-hover:text-oxblood"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

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
