'use client';
import { toast } from 'sonner';
import { sectionTitleCls, sectionSubCls, btnPrimary } from '../SettingsUI';
import { getInitials } from '@/lib/admin-utils';

const AVATAR_PALETTE = [
  'bg-oxblood text-cream',
  'bg-ink text-cream',
  'bg-camel text-ink',
  'bg-green text-cream',
  'bg-camel-soft text-ink',
];

type Member = { id: string; name: string; email: string };

type Props = { members: Member[] };

export default function TeamTab({ members }: Props) {
  return (
    <div>
      <h2 className={sectionTitleCls}>
        Team <em className="italic text-oxblood font-normal">members</em>
      </h2>
      <p className={sectionSubCls}>
        Manage who has access to this dashboard and what they can do. Admin users can change settings and manage other users. Staff can view orders and update inventory.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {members.map((m, idx) => (
          <div
            key={m.id}
            className="flex items-center gap-3.5 p-4 bg-paper border border-line-soft rounded-lg hover:border-line transition-colors group"
          >
            <div className={`w-11 h-11 rounded-full grid place-items-center font-display font-semibold text-sm shrink-0 ${AVATAR_PALETTE[idx % AVATAR_PALETTE.length]}`}>
              {getInitials(m.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-[15px] font-medium tracking-[-0.005em] mb-0.5">{m.name}</div>
              <div className="text-[11px] text-muted font-mono tracking-[0.04em]">{m.email.toUpperCase()}</div>
            </div>
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] tracking-widest uppercase font-medium shrink-0 bg-red-soft text-oxblood">
              Admin
            </span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                type="button"
                onClick={() => toast.info('Coming soon')}
                className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:text-ink transition-colors"
                aria-label={`Edit ${m.name}`}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => toast.info('Coming soon')}
                className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-oxblood hover:text-oxblood transition-colors"
                aria-label={`Remove ${m.name}`}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-[13px] text-muted col-span-2 py-4">No admin users found.</p>
        )}
      </div>
      <button type="button" onClick={() => toast.info('Coming soon')} className={btnPrimary}>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Invite team member
      </button>
    </div>
  );
}
