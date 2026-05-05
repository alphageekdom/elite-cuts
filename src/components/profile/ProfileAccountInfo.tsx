import Link from 'next/link';

type Props = {
  email: string;
  joinedAt: string;
};

function formatJoined(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

type RowProps = {
  label: string;
  value: React.ReactNode;
  truncate?: boolean;
};

function InfoRow({ label, value, truncate }: RowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-white/10 last:border-0 last:pb-0 first:pt-0">
      <span className="text-[12px] tracking-[0.04em] text-cream/60 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-cream text-right${truncate ? ' truncate min-w-0' : ''}`}>{value}</span>
    </div>
  );
}

export default function ProfileAccountInfo({ email, joinedAt }: Props) {
  return (
    <div className="bg-oxblood rounded p-7">
      <h3 className="font-display font-medium text-[18px] tracking-tight mb-1 text-cream">
        — Account info
      </h3>
      <p className="text-[13px] text-cream/50 mb-5">Personal details on file</p>

      <InfoRow label="Email" value={<span title={email}>{email}</span>} truncate />
      <InfoRow label="Member since" value={formatJoined(joinedAt)} />
      <InfoRow
        label="Birthday"
        value={
          <Link href="/profile?tab=settings" className="text-camel text-xs font-medium border-b border-current">
            Add
          </Link>
        }
      />
      <InfoRow label="Newsletter" value="Subscribed" />
    </div>
  );
}
