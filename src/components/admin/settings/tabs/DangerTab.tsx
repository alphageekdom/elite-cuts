'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { sectionTitleCls, btnGhost, btnDanger } from '../SettingsUI';

type ActionKey = 'export' | 'reset' | 'pause' | 'delete';

const ACTIONS: { key: ActionKey; label: string; desc: string; action: string; cls: string; destructive?: boolean }[] = [
  { key: 'export',  label: 'Export all data',      desc: 'Download a complete export of orders, customers, inventory, and analytics as CSV files.', action: 'Export all',      cls: btnGhost },
  { key: 'reset',   label: 'Reset analytics',       desc: 'Clear all analytics data and start tracking from scratch. Orders and customer records are preserved.',              action: 'Reset analytics', cls: btnDanger, destructive: true },
  { key: 'pause',   label: 'Pause the storefront',  desc: 'Disables online ordering and hides the shop. Your dashboard stays accessible.',           action: 'Pause shop',      cls: btnDanger, destructive: true },
  { key: 'delete',  label: 'Delete shop',           desc: 'Permanently deletes all orders, customers, stock, and analytics. This cannot be undone.', action: 'Delete shop',     cls: btnDanger, destructive: true },
];

const CONFIRM_LABELS: Record<ActionKey, string> = {
  export: 'Export all data?',
  reset:  'Reset all analytics data?',
  pause:  'Pause the storefront?',
  delete: 'Permanently delete the shop?',
};

export default function DangerTab() {
  const [confirming, setConfirming] = useState<ActionKey | null>(null);

  function handleAction(key: ActionKey) {
    if (key === 'export') {
      toast.success('Export started — you\'ll receive an email when it\'s ready');
      return;
    }
    setConfirming(key);
  }

  function handleConfirm(key: ActionKey) {
    setConfirming(null);
    toast.success(`${CONFIRM_LABELS[key].replace('?', '')} — coming soon`);
  }

  return (
    <div className="border border-oxblood/25 rounded-lg p-6 bg-oxblood/3">
      <h2 className={`${sectionTitleCls} text-oxblood mb-5`}>
        Danger <em className="italic font-normal">zone</em>
      </h2>
      {ACTIONS.map((row) => (
        <div
          key={row.key}
          className="py-3.5 border-b border-oxblood/10 last:border-0"
        >
          {confirming === row.key ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] text-ink-soft">
                <strong className="text-oxblood font-medium">{CONFIRM_LABELS[row.key]}</strong>
                {' '}This cannot be undone.
              </p>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => setConfirming(null)} className={btnGhost}>
                  Cancel
                </button>
                <button type="button" onClick={() => handleConfirm(row.key)} className={btnDanger}>
                  Confirm
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-display text-[15px] font-medium mb-0.5">{row.label}</div>
                <div className="text-xs text-muted max-w-[40ch]">{row.desc}</div>
              </div>
              <button
                type="button"
                onClick={() => handleAction(row.key)}
                className={`${row.cls} shrink-0`}
              >
                {row.action}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
