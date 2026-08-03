import type { ReactNode } from 'react';

import SiteShell from '@/components/layout/SiteShell';

// pt-20, not pt-16: this group includes `/`, where the navbar renders taller.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteShell mainClassName="pt-20">{children}</SiteShell>;
}
