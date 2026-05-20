import type { ReactNode } from 'react';
import Link from 'next/link';
import AdminEyebrow from './AdminEyebrow';

type Props = {
  eyebrow: string;
  breadcrumb: string;
  title: ReactNode;
  titleAccent: string;
  subtitle: ReactNode;
  actions?: ReactNode;
};

export default function AdminPageHeader({
  eyebrow,
  breadcrumb,
  title,
  titleAccent,
  subtitle,
  actions,
}: Props) {
  return (
    <div className="flex items-start justify-between mb-9 gap-6 flex-wrap">
      <div className="w-full flex items-center gap-2 text-[12px] text-muted tracking-[0.04em] mb-1">
        <Link href="/dashboard" className="hover:text-oxblood transition-colors">
          Dashboard
        </Link>
        <svg className="w-2.5 h-2.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-ink">{breadcrumb}</span>
      </div>

      <div>
        <AdminEyebrow size="page" className="mb-1.5">{eyebrow}</AdminEyebrow>
        <h1 className="font-display font-normal text-[clamp(36px,4vw,52px)] leading-none tracking-tight mb-1">
          {title} <em className="italic text-oxblood">{titleAccent}</em>
        </h1>
        <p className="text-muted text-sm tracking-[0.02em]">{subtitle}</p>
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap">{actions}</div>
      )}
    </div>
  );
}
