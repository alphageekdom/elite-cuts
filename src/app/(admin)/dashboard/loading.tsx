'use client';

import BarLoader from 'react-spinners/BarLoader';

// Sits below the (admin) layout, so the sidebar and topbar stay mounted while
// a dashboard page's server render is in flight — only the content area shows
// the loader. The customer side deliberately has no loading boundary: an
// ancestor Suspense fallback lets Next flush a 200 shell before the page runs,
// which turned notFound()/permanentRedirect() on the product and receipt
// routes into soft 404s and dead 308s (see the app-folder audit, 2026-07-29).
// Statuses don't matter behind the admin login, so the instant shell is a free
// win here.
const DashboardLoading = () => (
  <div role='status' aria-label='Loading' className='flex justify-center pt-25'>
    <BarLoader color='var(--color-oxblood)' width={150} />
  </div>
);

export default DashboardLoading;
