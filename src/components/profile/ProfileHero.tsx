import Link from 'next/link';

type Props = {
  name: string;
  email: string;
  createdAt: string;
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function memberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function splitName(name: string): [string, string] {
  const idx = name.lastIndexOf(' ');
  if (idx === -1) return [name, ''];
  return [name.slice(0, idx), name.slice(idx + 1)];
}

export default function ProfileHero({ name, email, createdAt }: Props) {
  const [firstName, lastName] = splitName(name);

  return (
    <section className="pt-12 pb-16 border-b border-line-soft">
      <div className="grid grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto] gap-8 lg:gap-10 items-center">

        {/* Avatar */}
        <div className="relative self-start">
          <div className="w-[100px] h-[100px] lg:w-[120px] lg:h-[120px] rounded-full bg-gradient-to-br from-oxblood to-oxblood-deep flex items-center justify-center font-display font-medium text-cream text-4xl lg:text-[44px] tracking-tight shadow-[0_12px_40px_rgba(107,31,31,0.25)] ring-1 ring-line ring-offset-[4px] ring-offset-cream select-none">
            {initials(name)}
          </div>
          <Link
            href="/profile?tab=settings"
            aria-label="Change photo"
            className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-cream text-ink flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] border-2 border-cream transition-transform hover:scale-110"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </Link>
        </div>

        {/* Identity */}
        <div>
          <p className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase text-muted mb-3">
            <span className="w-6 h-px bg-current opacity-50 shrink-0" />
            Member since {memberSince(createdAt)}
          </p>
          <h1 className="font-display font-normal text-[clamp(36px,4.5vw,56px)] leading-none tracking-tight mb-3">
            {firstName}
            {lastName && (
              <> <span className="italic text-oxblood">{lastName}</span></>
            )}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-muted text-sm">
            <span>{email}</span>
            <span className="w-[3px] h-[3px] rounded-full bg-current opacity-40" />
            <span className="inline-flex items-center gap-2 bg-ink text-cream px-3.5 py-1.5 rounded-full text-xs font-medium tracking-[0.04em]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-camel">
                <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z" />
              </svg>
              Connoisseur
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-2 lg:col-span-1 flex flex-row lg:flex-col gap-2.5 lg:items-end">
          <Link
            href="/profile?tab=settings"
            className="inline-flex items-center justify-center gap-2.5 bg-ink text-cream text-[13px] font-medium tracking-[0.04em] px-5 py-3.5 rounded-full transition-all hover:bg-oxblood hover:-translate-y-px flex-1 lg:flex-none"
          >
            Edit profile
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </Link>
          <Link
            href="/profile?tab=settings"
            className="inline-flex items-center justify-center bg-transparent text-ink-soft text-[13px] font-medium border border-line px-5 py-3 rounded-full transition-all hover:border-ink hover:bg-paper flex-1 lg:flex-none"
          >
            Settings
          </Link>
        </div>

      </div>
    </section>
  );
}
