import { sectionTitleCls, sectionSubCls } from '../SettingsUI';
import { getInitials } from '@/lib/format';

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {members.map((m, idx) => (
          <div
            key={m.id}
            className="flex items-center gap-3.5 p-4 bg-paper border border-line-soft rounded-lg"
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
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-[13px] text-muted col-span-2 py-4">No admin users found.</p>
        )}
      </div>
      <p className="text-xs text-muted">Team management is read-only in this demo.</p>
    </div>
  );
}
