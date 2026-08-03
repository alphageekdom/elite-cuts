import type { ReactNode } from 'react';

import SiteShell from '@/components/layout/SiteShell';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <SiteShell mainClassName="pt-16">{children}</SiteShell>;
}
