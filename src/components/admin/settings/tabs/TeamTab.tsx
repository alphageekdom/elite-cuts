import { sectionTitleCls, sectionSubCls, btnPrimary } from '../SettingsUI';

const MEMBERS = [
  { initials: 'TD', name: 'Tangelo Doe', email: 'TANGELO@ELITECUTS.COM', role: 'Admin', avatarCls: 'bg-oxblood text-cream', pillCls: 'bg-red-soft text-oxblood' },
  { initials: 'MR', name: 'Marcus Reyes', email: 'MARCUS@ELITECUTS.COM', role: 'Staff', avatarCls: 'bg-ink text-cream', pillCls: 'bg-ink/[0.06] text-ink-soft' },
  { initials: 'EH', name: 'Elena Huang', email: 'ELENA@ELITECUTS.COM', role: 'Staff', avatarCls: 'bg-camel text-ink', pillCls: 'bg-ink/[0.06] text-ink-soft' },
  { initials: 'SO', name: 'Sam Okafor', email: 'SAM@ELITECUTS.COM', role: 'Staff', avatarCls: 'bg-green text-cream', pillCls: 'bg-ink/[0.06] text-ink-soft' },
  { initials: 'MP', name: 'Maya Park', email: 'MAYA@ELITECUTS.COM', role: 'View only', avatarCls: 'bg-camel-soft text-ink', pillCls: 'bg-green-soft text-green' },
];

export default function TeamTab() {
  return (
    <div>
      <h2 className={sectionTitleCls}>
        Team <em className="italic text-oxblood font-normal">members</em>
      </h2>
      <p className={sectionSubCls}>
        Manage who has access to this dashboard and what they can do. Admin users can change settings and manage other users. Staff can view orders and update inventory.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {MEMBERS.map((m) => (
          <div
            key={m.initials}
            className="flex items-center gap-3.5 p-4 bg-paper border border-line-soft rounded-lg hover:border-line transition-colors"
          >
            <div className={`w-11 h-11 rounded-full grid place-items-center font-display font-semibold text-sm shrink-0 ${m.avatarCls}`}>
              {m.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-[15px] font-medium tracking-[-0.005em] mb-0.5">{m.name}</div>
              <div className="text-[11px] text-muted font-mono tracking-[0.04em]">{m.email}</div>
            </div>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] tracking-widest uppercase font-medium shrink-0 ${m.pillCls}`}>
              {m.role}
            </span>
          </div>
        ))}
      </div>
      <button type="button" className={btnPrimary}>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Invite team member
      </button>
    </div>
  );
}
