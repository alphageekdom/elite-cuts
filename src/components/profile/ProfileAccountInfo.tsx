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
};

function InfoRow({ label, value }: RowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-line-soft last:border-0 last:pb-0 first:pt-0">
      <span className="text-[12px] tracking-[0.04em] text-muted">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

export default function ProfileAccountInfo({ email, joinedAt }: Props) {
  return (
    <div className="bg-paper border border-line-soft rounded p-7">
      <h3 className="font-display font-medium text-[18px] tracking-tight mb-1">
        Account info
      </h3>
      <p className="text-[13px] text-muted mb-5">Personal details on file</p>

      <InfoRow label="Email" value={email} />
      <InfoRow label="Member since" value={formatJoined(joinedAt)} />
      <InfoRow
        label="Birthday"
        value={
          <Link href="/profile?tab=settings" className="text-oxblood text-xs font-medium border-b border-current">
            Add
          </Link>
        }
      />
      <InfoRow label="Newsletter" value="Subscribed" />
    </div>
  );
}
