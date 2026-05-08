import { sectionTitleCls, btnGhost, btnDanger } from '../SettingsUI';

const ACTIONS = [
  { label: 'Export all data', desc: 'Download a complete export of orders, customers, inventory, and analytics as CSV files.', action: 'Export all', cls: btnGhost },
  { label: 'Reset analytics', desc: 'Clear all analytics data and start tracking from scratch. Orders and customer records are preserved.', action: 'Reset analytics', cls: btnDanger },
  { label: 'Pause the storefront', desc: 'Disables online ordering and hides the shop. Your dashboard stays accessible.', action: 'Pause shop', cls: btnDanger },
  { label: 'Delete shop', desc: 'Permanently deletes all orders, customers, stock, and analytics. This cannot be undone.', action: 'Delete shop', cls: btnDanger },
];

export default function DangerTab() {
  return (
    <div className="border border-oxblood/25 rounded-lg p-6 bg-oxblood/3">
      <h2 className={`${sectionTitleCls} text-oxblood mb-5`}>
        Danger <em className="italic font-normal">zone</em>
      </h2>
      {ACTIONS.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-4 py-3.5 border-b border-oxblood/10 last:border-0"
        >
          <div>
            <div className="font-display text-[15px] font-medium mb-0.5">{row.label}</div>
            <div className="text-xs text-muted max-w-[40ch]">{row.desc}</div>
          </div>
          <button type="button" className={`${row.cls} shrink-0`}>
            {row.action}
          </button>
        </div>
      ))}
    </div>
  );
}
